import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PostScope, PostType, Role, SubmissionStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  /** Creates a Post(type=ASSIGNMENT) + Assignment row in one shot. */
  async create(
    schoolId: string,
    authorId: string,
    dto: {
      sectionId: string;
      title: string;
      body: string;
      dueAt: string;
      maxMarks?: number;
      allowLate?: boolean;
      attachments?: any[];
    },
  ) {
    const section = await this.prisma.section.findFirst({
      where: { id: dto.sectionId, schoolId },
    });
    if (!section) throw new BadRequestException('Section not in this school');

    return this.prisma.post.create({
      data: {
        schoolId,
        authorId,
        type: PostType.ASSIGNMENT,
        scope: PostScope.CLASS,
        sectionId: dto.sectionId,
        title: dto.title,
        body: dto.body,
        attachmentsJson: dto.attachments ?? [],
        publishedAt: new Date(),
        assignment: {
          create: {
            dueAt: new Date(dto.dueAt),
            maxMarks: dto.maxMarks,
            allowLate: dto.allowLate ?? true,
          },
        },
      },
      include: { assignment: true },
    });
  }

  async listForSection(schoolId: string, sectionId: string) {
    return this.prisma.post.findMany({
      where: { schoolId, sectionId, type: PostType.ASSIGNMENT },
      include: {
        assignment: { include: { _count: { select: { submissions: true } } } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(schoolId: string, assignmentId: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, role: true } },
            section: { include: { class: true } },
          },
        },
      },
    });
    if (!a || a.post.schoolId !== schoolId) throw new NotFoundException('Assignment not found');
    return a;
  }

  /** A student's own submission for an assignment, or null if they haven't submitted. */
  async myStudentSubmission(schoolId: string, assignmentId: string, studentId: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { post: { select: { schoolId: true } } },
    });
    if (!a || a.post.schoolId !== schoolId) throw new NotFoundException('Assignment not found');

    return this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: {
        gradedBy: { select: { id: true, name: true } },
      },
    });
  }

  async submissions(schoolId: string, assignmentId: string) {
    const a = await this.detail(schoolId, assignmentId);

    const [submissions, students] = await Promise.all([
      this.prisma.submission.findMany({
        where: { assignmentId },
        include: {
          student: { select: { id: true, name: true, rollNumber: true } },
          gradedBy: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { schoolId, sectionId: a.post.sectionId!, role: Role.STUDENT, isActive: true },
        select: { id: true, name: true, rollNumber: true },
      }),
    ]);

    const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
    const rows = students.map((s) => ({
      student: s,
      submission: byStudent.get(s.id) ?? null,
      status: byStudent.get(s.id)?.status ?? SubmissionStatus.PENDING,
      isLate: byStudent.get(s.id)?.isLate ?? false,
    }));

    return { assignment: a, rows };
  }

  async submit(
    schoolId: string,
    assignmentId: string,
    studentId: string,
    dto: { body?: string; attachments?: any[] },
  ) {
    const a = await this.detail(schoolId, assignmentId);
    if (!a.allowLate && a.dueAt < new Date()) {
      throw new ForbiddenException('Submissions closed for this assignment');
    }

    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: Role.STUDENT },
      select: { sectionId: true },
    });
    if (!student || student.sectionId !== a.post.sectionId) {
      throw new ForbiddenException('Not in this assignment’s section');
    }

    const bodyHash = dto.body ? sha256(dto.body.trim().toLowerCase()) : null;
    const now = new Date();
    const isLate = now > a.dueAt;

    return this.prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      update: {
        body: dto.body,
        attachmentsJson: dto.attachments ?? [],
        submittedAt: now,
        status: SubmissionStatus.SUBMITTED,
        isLate,
        bodyHash,
      },
      create: {
        schoolId,
        assignmentId,
        studentId,
        body: dto.body,
        attachmentsJson: dto.attachments ?? [],
        submittedAt: now,
        status: SubmissionStatus.SUBMITTED,
        isLate,
        bodyHash,
      },
    });
  }

  async grade(
    schoolId: string,
    submissionId: string,
    graderId: string,
    dto: { grade: number; feedback?: string },
  ) {
    const sub = await this.prisma.submission.findFirst({
      where: { id: submissionId, schoolId },
      include: { assignment: true },
    });
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.assignment.maxMarks && (dto.grade < 0 || dto.grade > sub.assignment.maxMarks)) {
      throw new BadRequestException(`grade out of range (0..${sub.assignment.maxMarks})`);
    }
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        gradedById: graderId,
        gradedAt: new Date(),
        status: SubmissionStatus.GRADED,
      },
    });
  }

  /** Lightweight "plagiarism" flag — finds submissions with the same bodyHash. */
  async duplicates(schoolId: string, assignmentId: string) {
    await this.detail(schoolId, assignmentId);
    const subs = await this.prisma.submission.findMany({
      where: { assignmentId, bodyHash: { not: null } },
      select: { id: true, studentId: true, bodyHash: true, student: { select: { name: true } } },
    });
    const groups = new Map<string, typeof subs>();
    for (const s of subs) {
      const arr = groups.get(s.bodyHash!) ?? [];
      arr.push(s);
      groups.set(s.bodyHash!, arr);
    }
    return [...groups.values()].filter((g) => g.length > 1);
  }
}

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}
