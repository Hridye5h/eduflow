import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AttendanceStatus,
  ChatScope,
  ConsentStatus,
  ConsentMethod,
  ExamType,
  FeeStatus,
  NotificationType,
  PostScope,
  PostType,
  Role,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * One-click sample data for a freshly registered school, so a principal (or a
 * sales demo) sees a living product instead of empty tables: two classes of
 * students with parents, a month of attendance, published + draft exams, fees
 * in every state, a timetable, class-wall posts and chat.
 *
 * Design constraints:
 * - Only loads into an EMPTY school (no students) — it can never pollute a real
 *   tenant that has begun entering data.
 * - Runs in the caller's tenant context (no RLS bypass): every row carries the
 *   caller's schoolId, and sequential createMany batches keep each statement
 *   fast instead of holding one long interactive transaction open against the
 *   pooled connection.
 * - Deterministic RNG so two demo schools look the same and re-runs are
 *   reproducible.
 */
@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(private prisma: PrismaService) {}

  async seed(schoolId: string, adminId: string) {
    const existingStudents = await this.prisma.db.user.count({
      where: { schoolId, role: Role.STUDENT },
    });
    if (existingStudents > 0) {
      throw new BadRequestException(
        'Sample data can only be loaded into a school with no students yet.',
      );
    }

    const year = await this.prisma.db.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    if (!year) {
      throw new BadRequestException('No current academic year — re-register the school.');
    }

    const rand = mulberry32(42);
    const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

    // ---- subjects ------------------------------------------------------
    const subjects = await this.prisma.db.subject.createManyAndReturn({
      data: [
        { schoolId, name: 'Mathematics', code: 'MATH' },
        { schoolId, name: 'Science', code: 'SCI' },
        { schoolId, name: 'English', code: 'ENG' },
        { schoolId, name: 'Hindi', code: 'HIN' },
        { schoolId, name: 'Social Science', code: 'SST' },
        { schoolId, name: 'Computer Science', code: 'CS' },
      ],
      skipDuplicates: true,
    });
    const subjectByName = new Map(subjects.map((s) => [s.name, s]));

    // ---- teachers ------------------------------------------------------
    const teachers = await this.prisma.db.user.createManyAndReturn({
      data: TEACHERS.map((name, i) => ({
        schoolId,
        role: Role.TEACHER,
        name,
        email: `teacher${i + 1}@demo.eduflow.local`,
      })),
    });

    // ---- classes + sections --------------------------------------------
    const class9 = await this.prisma.db.class.create({
      data: { schoolId, academicYearId: year.id, grade: 9, label: 'Class 9' },
    });
    const class10 = await this.prisma.db.class.create({
      data: { schoolId, academicYearId: year.id, grade: 10, label: 'Class 10' },
    });

    const section9A = await this.prisma.db.section.create({
      data: { schoolId, classId: class9.id, name: 'A', classTeacherId: teachers[0].id },
    });
    const section10A = await this.prisma.db.section.create({
      data: { schoolId, classId: class10.id, name: 'A', classTeacherId: teachers[1].id },
    });

    await this.prisma.db.classSubject.createMany({
      data: [class9, class10].flatMap((cls) =>
        subjects.map((s, i) => ({
          schoolId,
          classId: cls.id,
          subjectId: s.id,
          teacherId: teachers[i % teachers.length].id,
        })),
      ),
      skipDuplicates: true,
    });

    // ---- students + parents ---------------------------------------------
    const mkStudents = (sectionId: string, names: string[], gradeAge: number) =>
      this.prisma.db.user.createManyAndReturn({
        data: names.map((name, i) => ({
          schoolId,
          role: Role.STUDENT,
          name,
          sectionId,
          rollNumber: String(i + 1),
          dateOfBirth: new Date(Date.UTC(new Date().getUTCFullYear() - gradeAge, (i * 5) % 12, ((i * 7) % 27) + 1)),
        })),
      });

    const students9 = await mkStudents(section9A.id, STUDENT_NAMES.slice(0, 22), 14);
    const students10 = await mkStudents(section10A.id, STUDENT_NAMES.slice(22, 44), 15);
    const allStudents = [...students9, ...students10];

    const parents = await this.prisma.db.user.createManyAndReturn({
      data: allStudents.map((s) => {
        const surname = s.name.split(' ').slice(-1)[0];
        return {
          schoolId,
          role: Role.PARENT,
          name: `${pick(PARENT_FIRST)} ${surname}`,
        };
      }),
    });
    await this.prisma.db.parentLink.createMany({
      data: allStudents.map((s, i) => ({
        parentId: parents[i].id,
        studentId: s.id,
        relation: i % 3 === 0 ? 'Mother' : 'Father',
      })),
      skipDuplicates: true,
    });

    // ---- attendance: last 30 days, skipping Sundays ----------------------
    const attendanceRows: {
      schoolId: string;
      sectionId: string;
      studentId: string;
      date: Date;
      status: AttendanceStatus;
      markedById: string;
    }[] = [];
    const today = new Date();
    for (let back = 30; back >= 1; back--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - back));
      if (d.getUTCDay() === 0) continue; // Sunday
      for (const [section, list, teacher] of [
        [section9A, students9, teachers[0]] as const,
        [section10A, students10, teachers[1]] as const,
      ]) {
        for (const s of list) {
          const r = rand();
          const status =
            r < 0.9 ? AttendanceStatus.PRESENT
            : r < 0.95 ? AttendanceStatus.ABSENT
            : r < 0.98 ? AttendanceStatus.LATE
            : AttendanceStatus.HALF_DAY;
          attendanceRows.push({
            schoolId,
            sectionId: section.id,
            studentId: s.id,
            date: d,
            status,
            markedById: teacher.id,
          });
        }
      }
    }
    await this.prisma.db.attendanceRecord.createMany({ data: attendanceRows, skipDuplicates: true });

    // ---- exams + marks ----------------------------------------------------
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
    const gradeFor = (pct: number) =>
      pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : pct >= 33 ? 'D' : 'E';

    let examCount = 0;
    for (const [cls, list, teacher] of [
      [class9, students9, teachers[0]] as const,
      [class10, students10, teachers[1]] as const,
    ]) {
      const specs = [
        { name: `Unit Test 1 · Mathematics`, type: ExamType.UNIT_TEST, subject: 'Mathematics', max: 25, date: daysAgo(21), published: true, coverage: 1 },
        { name: `Mid-term · Science`, type: ExamType.MID_TERM, subject: 'Science', max: 80, date: daysAgo(8), published: true, coverage: 1 },
        { name: `Unit Test 2 · English`, type: ExamType.UNIT_TEST, subject: 'English', max: 25, date: daysAgo(2), published: false, coverage: 0.6 },
      ];
      for (const spec of specs) {
        const subject = subjectByName.get(spec.subject)!;
        const exam = await this.prisma.db.exam.create({
          data: {
            schoolId,
            academicYearId: year.id,
            name: spec.name,
            type: spec.type,
            classId: cls.id,
            subjectId: subject.id,
            maxMarks: spec.max,
            passMarks: Math.round(spec.max * 0.33),
            date: spec.date,
            publishedAt: spec.published ? spec.date : null,
          },
        });
        examCount++;
        const graded = list.slice(0, Math.ceil(list.length * spec.coverage));
        await this.prisma.db.examMark.createMany({
          data: graded.map((s) => {
            // roughly normal around 68% with a wide spread, clamped to [20%, 99%]
            const pct = Math.min(0.99, Math.max(0.2, 0.68 + (rand() + rand() - 1) * 0.3));
            const marks = Math.round(spec.max * pct * 2) / 2;
            return {
              schoolId,
              examId: exam.id,
              studentId: s.id,
              subjectId: subject.id,
              marks,
              grade: gradeFor(pct * 100),
              enteredById: teacher.id,
            };
          }),
          skipDuplicates: true,
        });
      }
    }

    // ---- fees: one overdue mandatory + one upcoming optional per class ----
    let paymentCount = 0;
    for (const [cls, list] of [
      [class9, students9] as const,
      [class10, students10] as const,
    ]) {
      const tuition = await this.prisma.db.feeStructure.create({
        data: { schoolId, classId: cls.id, name: 'Tuition · Term 1', amount: 12000, dueDate: daysAgo(15), isMandatory: true },
      });
      const activity = await this.prisma.db.feeStructure.create({
        data: { schoolId, classId: cls.id, name: 'Activity & Sports', amount: 1500, dueDate: daysAgo(-20), isMandatory: false },
      });

      const rows = list.flatMap((s) => {
        const r = rand();
        const tuitionRow =
          r < 0.6
            ? { structureId: tuition.id, amountPaid: 12000, status: FeeStatus.PAID, paidAt: daysAgo(Math.ceil(rand() * 14)), txnRef: `UPI-${s.id.slice(0, 8)}` }
            : r < 0.75
              ? { structureId: tuition.id, amountPaid: 6000, status: FeeStatus.PARTIAL, paidAt: daysAgo(Math.ceil(rand() * 10)) }
              : { structureId: tuition.id, amountPaid: 0, status: FeeStatus.PENDING, paidAt: null as Date | null };
        const activityRow =
          rand() < 0.4
            ? { structureId: activity.id, amountPaid: 1500, status: FeeStatus.PAID, paidAt: daysAgo(Math.ceil(rand() * 5)) }
            : { structureId: activity.id, amountPaid: 0, status: FeeStatus.PENDING, paidAt: null as Date | null };
        return [tuitionRow, activityRow].map((row) => ({ schoolId, studentId: s.id, ...row }));
      });
      await this.prisma.db.feePayment.createMany({ data: rows });
      paymentCount += rows.length;
    }

    // ---- timetable: Mon–Sat, 6 periods/day per section --------------------
    const times = ['09:00', '09:50', '10:40', '11:40', '12:30', '14:00'];
    for (const section of [section9A, section10A]) {
      const timetable = await this.prisma.db.timetable.create({
        data: { schoolId, sectionId: section.id },
      });
      await this.prisma.db.timetablePeriod.createMany({
        data: Array.from({ length: 6 }, (_, day) =>
          times.map((start, p) => {
            const subject = subjects[(day + p) % subjects.length];
            return {
              timetableId: timetable.id,
              dayOfWeek: day,
              periodIndex: p + 1,
              startTime: start,
              endTime: `${start.slice(0, 2)}:45`,
              subjectId: subject.id,
              teacherId: teachers[(day + p) % teachers.length].id,
            };
          }),
        ).flat(),
        skipDuplicates: true,
      });
    }

    // ---- class wall: notices + an assignment with submissions -------------
    await this.prisma.db.post.createMany({
      data: [
        {
          schoolId,
          authorId: adminId,
          scope: PostScope.SCHOOL,
          type: PostType.ANNOUNCEMENT,
          title: 'Welcome to EduFlow',
          body: 'This school is running on EduFlow — attendance, marks, fees and parent updates in one place.',
          publishedAt: daysAgo(25),
        },
        {
          schoolId,
          authorId: adminId,
          scope: PostScope.SCHOOL,
          type: PostType.NOTICE,
          title: 'Parent–teacher meeting on Saturday',
          body: 'PTM for all classes this Saturday, 10:00–13:00. Report cards will be shared during the meeting.',
          publishedAt: daysAgo(3),
        },
      ],
    });

    for (const [section, list, teacher] of [
      [section9A, students9, teachers[0]] as const,
      [section10A, students10, teachers[1]] as const,
    ]) {
      const post = await this.prisma.db.post.create({
        data: {
          schoolId,
          authorId: teacher.id,
          scope: PostScope.CLASS,
          sectionId: section.id,
          type: PostType.ASSIGNMENT,
          title: 'Chapter 4 — practice problems',
          body: 'Solve the 12 practice problems at the end of chapter 4. Show your working; submit a photo or PDF.',
          publishedAt: daysAgo(4),
          assignment: { create: { dueAt: daysAgo(-5), maxMarks: 20 } },
        },
        include: { assignment: true },
      });
      const submitted = list.filter(() => rand() < 0.35);
      if (submitted.length) {
        await this.prisma.db.submission.createMany({
          data: submitted.map((s) => ({
            schoolId,
            assignmentId: post.assignment!.id,
            studentId: s.id,
            body: 'Submitted — see attached worksheet.',
            submittedAt: daysAgo(Math.ceil(rand() * 3)),
            status: SubmissionStatus.SUBMITTED,
          })),
          skipDuplicates: true,
        });
      }
    }

    // ---- chat: one section group per class with a short thread ------------
    for (const [section, cls, list, teacher] of [
      [section9A, class9, students9, teachers[0]] as const,
      [section10A, class10, students10, teachers[1]] as const,
    ]) {
      const group = await this.prisma.db.chatGroup.create({
        data: {
          schoolId,
          scope: ChatScope.GROUP,
          sectionId: section.id,
          name: `${cls.label} — Section ${section.name}`,
          studentToStudent: false,
        },
      });
      await this.prisma.db.chatMessage.createMany({
        data: [
          { schoolId, groupId: group.id, authorId: teacher.id, body: 'Reminder: bring your practical files tomorrow.' },
          { schoolId, groupId: group.id, authorId: list[2].id, body: 'Ma’am, is the chapter 4 worksheet included?' },
          { schoolId, groupId: group.id, authorId: teacher.id, body: 'Yes — worksheet + lab record both.' },
        ],
      });
    }

    // ---- parental consent for AI reports (first 6 of class 10) ------------
    await this.prisma.db.consentEvent.createMany({
      data: students10.slice(0, 6).map((s, i) => ({
        schoolId,
        studentId: s.id,
        guardianId: parents[22 + i]?.id,
        purpose: 'ai_test_reports',
        status: ConsentStatus.GRANTED,
        method: ConsentMethod.PHONE_OTP_KYC,
        note: 'Demo data — consent pre-granted so AI grading can be demonstrated.',
      })),
    });

    // ---- a couple of notifications for the admin ---------------------------
    await this.prisma.db.notification.createMany({
      data: [
        {
          schoolId,
          userId: adminId,
          type: NotificationType.GENERIC,
          title: 'Sample data loaded',
          body: 'Two classes, 44 students, a month of attendance, exams, fees and a timetable are ready to explore.',
        },
        {
          schoolId,
          userId: adminId,
          type: NotificationType.FEE_REMINDER,
          title: 'Tuition · Term 1 is past due',
          body: 'Several students still have pending or partial tuition payments — open Fees to review.',
        },
      ],
    });

    const summary = {
      subjects: subjects.length,
      teachers: teachers.length,
      classes: 2,
      sections: 2,
      students: allStudents.length,
      parents: parents.length,
      attendanceRecords: attendanceRows.length,
      exams: examCount,
      feePayments: paymentCount,
      consentGrants: 6,
    };
    this.logger.log(`Seeded demo data for school ${schoolId}: ${JSON.stringify(summary)}`);
    return summary;
  }
}

/** Deterministic PRNG so demo schools are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEACHERS = [
  'Asha Verma',
  'Rakesh Tiwari',
  'Neha Srivastava',
  'Manoj Dubey',
  'Pooja Mishra',
];

const PARENT_FIRST = [
  'Rajesh', 'Sunita', 'Anil', 'Meena', 'Suresh', 'Kavita', 'Ramesh', 'Geeta',
  'Vinod', 'Rekha', 'Ashok', 'Usha',
];

const STUDENT_NAMES = [
  // Class 9-A
  'Aarav Sharma', 'Diya Gupta', 'Arjun Singh', 'Ananya Mishra', 'Vivaan Yadav',
  'Ishita Tripathi', 'Aditya Pandey', 'Sneha Patel', 'Rohan Verma', 'Priya Tiwari',
  'Kabir Khan', 'Tanvi Agarwal', 'Yash Srivastava', 'Nandini Dubey', 'Harsh Maurya',
  'Riya Saxena', 'Dev Chauhan', 'Pooja Kushwaha', 'Samar Ali', 'Khushi Rastogi',
  'Atharv Joshi', 'Mahi Bajpai',
  // Class 10-A
  'Shaurya Singh', 'Aditi Sharma', 'Krishna Yadav', 'Navya Gupta', 'Reyansh Pandey',
  'Kiara Srivastava', 'Ayaan Siddiqui', 'Sara Khanna', 'Vihaan Mishra', 'Anika Tiwari',
  'Rudra Pratap', 'Myra Agarwal', 'Arnav Dubey', 'Avni Tripathi', 'Kartik Verma',
  'Ira Saxena', 'Shivansh Maurya', 'Prisha Patel', 'Daksh Rathore', 'Jhanvi Bhatt',
  'Veer Chaudhary', 'Aadhya Nigam',
];
