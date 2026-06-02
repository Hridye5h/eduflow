import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type MarkInput = { studentId: string; subjectId?: string; marks: number; remarks?: string };

@Injectable()
export class MarksService {
  constructor(private prisma: PrismaService) {}

  // ---- Exams ----
  async createExam(
    schoolId: string,
    data: {
      name: string;
      type: ExamType;
      classId: string;
      subjectId?: string;
      maxMarks: number;
      passMarks?: number;
      date?: string;
    },
  ) {
    const year = await this.currentYear(schoolId);
    const cls = await this.prisma.class.findFirst({ where: { id: data.classId, schoolId } });
    if (!cls) throw new BadRequestException('Class not in this school');

    return this.prisma.exam.create({
      data: {
        schoolId,
        academicYearId: year.id,
        name: data.name,
        type: data.type,
        classId: data.classId,
        subjectId: data.subjectId,
        maxMarks: data.maxMarks,
        passMarks: data.passMarks,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  async listExams(schoolId: string, classId?: string) {
    return this.prisma.exam.findMany({
      where: { schoolId, ...(classId && { classId }) },
      include: {
        class: { select: { id: true, label: true, grade: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { marks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getExam(schoolId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId },
      include: {
        class: { include: { sections: true } },
        subject: true,
        marks: true,
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async enterMarks(schoolId: string, examId: string, enteredById: string, rows: MarkInput[]) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new NotFoundException('Exam not found');

    // Validate up-front so we never open a transaction for a bad row.
    for (const r of rows) {
      if (r.marks < 0 || r.marks > exam.maxMarks) {
        throw new BadRequestException(`Marks ${r.marks} out of range (0..${exam.maxMarks})`);
      }
    }

    // Prisma 5 rejects `null` inside composite-unique `where` payloads
    // (`examId_studentId_subjectId`), so we can't use upsert when subjectId
    // is nullable. Fall back to find-then-update/create inside an
    // interactive transaction so the whole batch is still atomic.
    const saved = await this.prisma.$transaction(async (tx) => {
      const out: any[] = [];
      for (const r of rows) {
        const subjectId = r.subjectId ?? exam.subjectId ?? null;
        const grade = this.gradeFor(r.marks, exam.maxMarks);
        const existing = await tx.examMark.findFirst({
          where: { examId, studentId: r.studentId, subjectId },
          select: { id: true },
        });
        if (existing) {
          out.push(
            await tx.examMark.update({
              where: { id: existing.id },
              data: { marks: r.marks, remarks: r.remarks, enteredById, grade },
            }),
          );
        } else {
          out.push(
            await tx.examMark.create({
              data: {
                schoolId,
                examId,
                studentId: r.studentId,
                subjectId,
                marks: r.marks,
                remarks: r.remarks,
                enteredById,
                grade,
              },
            }),
          );
        }
      }
      return out;
    });

    return { saved: saved.length };
  }

  async publishExam(schoolId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, schoolId } });
    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.publishedAt) return exam;

    const updated = await this.prisma.exam.update({
      where: { id: examId },
      data: { publishedAt: new Date() },
    });

    // notify parents of every student that has marks for this exam
    const marks = await this.prisma.examMark.findMany({
      where: { examId },
      select: { studentId: true },
    });
    const studentIds = [...new Set(marks.map((m) => m.studentId))];
    if (studentIds.length) {
      const links = await this.prisma.parentLink.findMany({
        where: { studentId: { in: studentIds } },
        select: { parentId: true, studentId: true },
      });
      // also notify the students themselves
      const targets = [
        ...links.map((l) => ({ userId: l.parentId, studentId: l.studentId })),
        ...studentIds.map((sid) => ({ userId: sid, studentId: sid })),
      ];
      await this.prisma.notification.createMany({
        data: targets.map((t) => ({
          schoolId,
          userId: t.userId,
          type: 'MARKS_PUBLISHED' as const,
          title: `${exam.name} results published`,
          body: `Marks for ${exam.name} are now available.`,
          dataJson: { examId, studentId: t.studentId },
        })),
        skipDuplicates: true,
      });
    }

    return updated;
  }

  async classSummary(schoolId: string, examId: string) {
    const marks = await this.prisma.examMark.findMany({
      where: { schoolId, examId },
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!marks.length) return { exam: examId, students: [], stats: null };

    const exam = await this.prisma.exam.findUniqueOrThrow({ where: { id: examId } });

    // bucket by student (sum of subject marks if multi-subject exam)
    const byStudent = new Map<string, { student: any; total: number; max: number }>();
    for (const m of marks) {
      const prev = byStudent.get(m.studentId) ?? { student: m.student, total: 0, max: 0 };
      prev.total += m.marks;
      prev.max += exam.maxMarks; // per-subject max
      byStudent.set(m.studentId, prev);
    }

    const ranked = [...byStudent.values()]
      .map((s) => ({
        ...s,
        percentage: Math.round((s.total / s.max) * 100),
      }))
      .sort((a, b) => b.total - a.total)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const totals = ranked.map((r) => r.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];

    return {
      exam,
      students: ranked,
      stats: {
        count: ranked.length,
        averageMarks: Math.round(avg * 10) / 10,
        topStudent: top?.student?.name,
        bottomStudent: bottom?.student?.name,
      },
    };
  }

  async studentReport(schoolId: string, studentId: string, academicYearId?: string) {
    const year = academicYearId ?? (await this.currentYear(schoolId)).id;
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: Role.STUDENT },
      include: {
        section: { include: { class: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const marks = await this.prisma.examMark.findMany({
      where: { schoolId, studentId, exam: { academicYearId: year, publishedAt: { not: null } } },
      include: {
        exam: { select: { id: true, name: true, type: true, maxMarks: true, date: true, publishedAt: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ exam: { date: 'asc' } }, { subject: { name: 'asc' } }],
    });

    // group by exam
    const examMap = new Map<string, any>();
    for (const m of marks) {
      const ex = examMap.get(m.exam.id) ?? {
        exam: m.exam,
        rows: [] as any[],
        total: 0,
        max: 0,
      };
      ex.rows.push({
        subject: m.subject?.name ?? 'Overall',
        marks: m.marks,
        max: m.exam.maxMarks,
        grade: m.grade,
        remarks: m.remarks,
      });
      ex.total += m.marks;
      ex.max += m.exam.maxMarks;
      examMap.set(m.exam.id, ex);
    }
    const exams = [...examMap.values()].map((e) => ({
      ...e,
      percentage: Math.round((e.total / e.max) * 100),
    }));

    const cumulative = exams.length
      ? {
          total: exams.reduce((a, b) => a + b.total, 0),
          max: exams.reduce((a, b) => a + b.max, 0),
          percentage:
            Math.round(
              (exams.reduce((a, b) => a + b.total, 0) /
                Math.max(exams.reduce((a, b) => a + b.max, 0), 1)) *
                100,
            ),
        }
      : null;

    return { student, exams, cumulative };
  }

  // ---- helpers ----
  private async currentYear(schoolId: string) {
    const year =
      (await this.prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } })) ??
      (await this.prisma.academicYear.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
      }));
    if (!year) throw new BadRequestException('No academic year configured');
    return year;
  }

  private gradeFor(marks: number, max: number) {
    const pct = (marks / max) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  }
}
