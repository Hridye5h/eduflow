/* eslint-disable no-console */
import {
  PrismaClient,
  Role,
  Board,
  AttendanceStatus,
  ExamType,
  PostType,
  PostScope,
  SubmissionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =====================================================================
// CONFIG
// =====================================================================

const SUB = process.env.SEED_SUBDOMAIN || 'springfield';
const SCHOOL_NAME = process.env.SEED_SCHOOL_NAME || 'Springfield Public School';
const PRINCIPAL_EMAIL = `principal@${SUB}.eduflow.local`;
const PRINCIPAL_PASSWORD = 'principal123';
const TEACHER_PASSWORD = 'teacher123';
const STUDENT_PASSWORD = 'student123';
const PARENT_PASSWORD = 'parent123';

const YEAR_LABEL = '2026-2027';
const YEAR_START = new Date('2026-04-01');
const YEAR_END = new Date('2027-03-31');

const STUDENTS_PER_SECTION = 30;
const ATTENDANCE_DAYS = 30;

// 11/12 streams
const STREAMS = [
  { code: 'SCI-M', label: 'Science (Maths)' },
  { code: 'SCI-B', label: 'Science (Biology)' },
  { code: 'COMM',  label: 'Commerce' },
  { code: 'ARTS',  label: 'Arts' },
];

// Subjects offered by each stream / grade range
const SUBJECTS_BASE = ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science', 'Physical Education'];
const SUBJECTS_SCIM = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Computer Science'];
const SUBJECTS_SCIB = ['English', 'Physics', 'Chemistry', 'Biology', 'Mathematics'];
const SUBJECTS_COMM = ['Mathematics', 'English', 'Accountancy', 'Business Studies', 'Economics'];
const SUBJECTS_ARTS = ['English', 'Hindi', 'History', 'Geography', 'Political Science'];

const ALL_SUBJECTS = [
  ...SUBJECTS_BASE,
  'Physics', 'Chemistry', 'Biology',
  'Accountancy', 'Business Studies', 'Economics',
  'History', 'Geography', 'Political Science',
];

// 12 teachers, named and assigned a primary subject they teach
const TEACHERS = [
  { first: 'Priya',   last: 'Sharma',  subject: 'Mathematics' },
  { first: 'Rahul',   last: 'Verma',   subject: 'English' },
  { first: 'Anjali',  last: 'Iyer',    subject: 'Science' },
  { first: 'Vikram',  last: 'Singh',   subject: 'Social Studies' },
  { first: 'Meera',   last: 'Reddy',   subject: 'Hindi' },
  { first: 'Karan',   last: 'Mehta',   subject: 'Computer Science' },
  { first: 'Sunita',  last: 'Joshi',   subject: 'Physical Education' },
  { first: 'Rajesh',  last: 'Nair',    subject: 'Physics' },
  { first: 'Neha',    last: 'Kapoor',  subject: 'Chemistry' },
  { first: 'Amit',    last: 'Roy',     subject: 'Biology' },
  { first: 'Divya',   last: 'Agarwal', subject: 'Economics' },
  { first: 'Sanjay',  last: 'Bhat',    subject: 'History' },
];

// Student name pool — enough for 300 unique combos
const STUDENT_FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan',
  'Shaurya', 'Atharv', 'Aryan', 'Dhruv', 'Kabir', 'Riaan', 'Rohan', 'Yash',
  'Veer', 'Rudra', 'Ayaan', 'Vivaan', 'Ansh', 'Tanish', 'Neel', 'Hrishikesh',
  'Aanya', 'Anaya', 'Saanvi', 'Diya', 'Pari', 'Myra', 'Anika', 'Aaradhya',
  'Ananya', 'Aadhya', 'Shanaya', 'Kiara', 'Mahika', 'Ira', 'Ridhima', 'Vanya',
  'Navya', 'Avni', 'Riya', 'Tara', 'Zara', 'Esha', 'Kavya', 'Anvi',
];
const STUDENT_LAST_NAMES = [
  'Sharma', 'Verma', 'Singh', 'Kumar', 'Patel', 'Mehta', 'Reddy', 'Gupta',
  'Iyer', 'Nair', 'Rao', 'Chopra', 'Joshi', 'Kapoor', 'Saxena', 'Agarwal',
  'Bhat', 'Desai', 'Khanna', 'Malhotra', 'Pandey', 'Roy', 'Sen', 'Trivedi',
  'Banerjee',
];

function studentNameFor(i: number): string {
  const f = STUDENT_FIRST_NAMES[i % STUDENT_FIRST_NAMES.length];
  const l = STUDENT_LAST_NAMES[Math.floor(i / STUDENT_FIRST_NAMES.length) % STUDENT_LAST_NAMES.length];
  return `${f} ${l}`;
}

function teacherEmail(t: typeof TEACHERS[number]) { return `t.${t.first.toLowerCase()}@${SUB}.eduflow.local`; }
function studentEmail(roll: string)               { return `s.${roll.toLowerCase()}@${SUB}.eduflow.local`; }
function parentEmail(roll: string)                { return `p.${roll.toLowerCase()}@${SUB}.eduflow.local`; }

function sectionsFor(grade: number) {
  return grade <= 10
    ? [{ name: 'A', display: `Class ${grade} — Section A`, subjects: SUBJECTS_BASE }]
    : STREAMS.map((s) => ({
        name: s.code,
        display: `Class ${grade} — ${s.label}`,
        subjects:
          s.code === 'SCI-M' ? SUBJECTS_SCIM :
          s.code === 'SCI-B' ? SUBJECTS_SCIB :
          s.code === 'COMM'  ? SUBJECTS_COMM :
                               SUBJECTS_ARTS,
      }));
}

// PRNG seeded for reproducibility
let _rngSeed = 0x9e3779b9;
function rand() {
  _rngSeed = (_rngSeed + 0x6d2b79f5) | 0;
  let t = _rngSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function chance(p: number) { return rand() < p; }
function range(n: number) { return Array.from({ length: n }, (_, i) => i); }

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  console.log(`\n🏫  Seeding demo school "${SCHOOL_NAME}" (${SUB})\n`);

  // ---- 1. School ----
  const school = await prisma.school.upsert({
    where: { subdomain: SUB },
    update: { name: SCHOOL_NAME, board: Board.CBSE },
    create: { name: SCHOOL_NAME, subdomain: SUB, board: Board.CBSE, email: PRINCIPAL_EMAIL },
  });

  // ---- 2. Wipe prior demo data for this school (idempotent re-runs) ----
  console.log('  • Wiping prior demo data…');
  await prisma.notification.deleteMany({ where: { schoolId: school.id } });
  await prisma.chatMessage.deleteMany({ where: { schoolId: school.id } });
  await prisma.chatMember.deleteMany({ where: { group: { schoolId: school.id } } });
  await prisma.chatGroup.deleteMany({ where: { schoolId: school.id } });
  await prisma.submission.deleteMany({ where: { schoolId: school.id } });
  await prisma.assignment.deleteMany({ where: { post: { schoolId: school.id } } });
  await prisma.postComment.deleteMany({ where: { schoolId: school.id } });
  await prisma.postReaction.deleteMany({ where: { schoolId: school.id } });
  await prisma.post.deleteMany({ where: { schoolId: school.id } });
  await prisma.examMark.deleteMany({ where: { schoolId: school.id } });
  await prisma.exam.deleteMany({ where: { schoolId: school.id } });
  await prisma.attendanceRecord.deleteMany({ where: { schoolId: school.id } });
  await prisma.leaveApplication.deleteMany({ where: { schoolId: school.id } });
  await prisma.timetableSubstitution.deleteMany({ where: { period: { timetable: { schoolId: school.id } } } });
  await prisma.timetablePeriod.deleteMany({ where: { timetable: { schoolId: school.id } } });
  await prisma.timetable.deleteMany({ where: { schoolId: school.id } });
  await prisma.classSubject.deleteMany({ where: { schoolId: school.id } });
  await prisma.parentLink.deleteMany({ where: { student: { schoolId: school.id } } });
  // Keep SUPER_ADMIN, wipe the rest
  await prisma.user.deleteMany({ where: { schoolId: school.id, role: { not: Role.SUPER_ADMIN } } });
  await prisma.subject.deleteMany({ where: { schoolId: school.id } });
  await prisma.section.deleteMany({ where: { schoolId: school.id } });
  await prisma.class.deleteMany({ where: { schoolId: school.id } });
  await prisma.academicYear.deleteMany({ where: { schoolId: school.id } });

  // ---- 3. Principal (admin) ----
  const principalHash = await bcrypt.hash(PRINCIPAL_PASSWORD, 10);
  await prisma.user.upsert({
    where: { schoolId_email: { schoolId: school.id, email: PRINCIPAL_EMAIL } },
    update: { password: principalHash, name: 'Principal Mathur', role: Role.SUPER_ADMIN },
    create: {
      schoolId: school.id,
      role: Role.SUPER_ADMIN,
      email: PRINCIPAL_EMAIL,
      name: 'Principal Mathur',
      password: principalHash,
    },
  });

  // ---- 4. Academic year ----
  const year = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      label: YEAR_LABEL,
      startDate: YEAR_START,
      endDate: YEAR_END,
      isCurrent: true,
    },
  });
  console.log(`  ✓ Academic year ${YEAR_LABEL}`);

  // ---- 5. Subjects ----
  await prisma.subject.createMany({
    data: ALL_SUBJECTS.map((name) => ({
      schoolId: school.id,
      name,
      code: name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 4),
    })),
  });
  const subjectsById = new Map<string, string>();
  const subjects = await prisma.subject.findMany({ where: { schoolId: school.id } });
  subjects.forEach((s) => subjectsById.set(s.name, s.id));
  console.log(`  ✓ ${subjects.length} subjects`);

  // ---- 6. Teachers ----
  const teacherHash = await bcrypt.hash(TEACHER_PASSWORD, 10);
  const teachers = await Promise.all(
    TEACHERS.map((t) =>
      prisma.user.create({
        data: {
          schoolId: school.id,
          role: Role.TEACHER,
          email: teacherEmail(t),
          name: `${t.first} ${t.last}`,
          password: teacherHash,
        },
        select: { id: true, name: true, email: true },
      }),
    ),
  );
  console.log(`  ✓ ${teachers.length} teachers`);

  // Map subject → teacherId (primary teacher of each subject)
  const teacherBySubject = new Map<string, string>();
  TEACHERS.forEach((t, i) => teacherBySubject.set(t.subject, teachers[i].id));
  // Subjects without an explicit primary teacher → assign to first available
  ALL_SUBJECTS.forEach((s) => {
    if (!teacherBySubject.has(s)) teacherBySubject.set(s, teachers[0].id);
  });

  // ---- 7. Classes + sections (with class teachers round-robin) ----
  const sectionRecords: Array<{ id: string; classId: string; grade: number; name: string; display: string; subjects: string[]; students: { id: string; rollNumber: string; name: string }[] }> = [];
  let ctIndex = 0;
  for (const grade of [9, 10, 11, 12]) {
    const cls = await prisma.class.create({
      data: { schoolId: school.id, academicYearId: year.id, grade, label: `Grade ${grade}` },
    });
    for (const sec of sectionsFor(grade)) {
      const section = await prisma.section.create({
        data: {
          schoolId: school.id,
          classId: cls.id,
          name: sec.name,
          classTeacherId: teachers[ctIndex % teachers.length].id,
        },
      });
      ctIndex++;
      sectionRecords.push({
        id: section.id,
        classId: cls.id,
        grade,
        name: sec.name,
        display: sec.display,
        subjects: sec.subjects,
        students: [],
      });
    }
  }
  console.log(`  ✓ ${sectionRecords.length} sections across 4 grades`);

  // ---- 8. Students (300 total) + Parents (one per student) ----
  const studentHash = await bcrypt.hash(STUDENT_PASSWORD, 10);
  const parentHash = await bcrypt.hash(PARENT_PASSWORD, 10);
  let nameIdx = 0;
  let studentCount = 0;
  let parentCount = 0;

  for (const section of sectionRecords) {
    const students = await prisma.$transaction(
      range(STUDENTS_PER_SECTION).map((i) => {
        const roll = `${section.grade}${section.name}${String(i + 1).padStart(2, '0')}`;
        const name = studentNameFor(nameIdx++);
        return prisma.user.create({
          data: {
            schoolId: school.id,
            sectionId: section.id,
            role: Role.STUDENT,
            email: studentEmail(roll),
            name,
            rollNumber: roll,
            password: studentHash,
          },
          select: { id: true, rollNumber: true, name: true },
        });
      }),
    );
    section.students = students.map((s) => ({ id: s.id, rollNumber: s.rollNumber!, name: s.name }));
    studentCount += students.length;

    // Create one parent per student in this section
    const parents = await prisma.$transaction(
      students.map((s) => {
        const lastName = s.name.split(' ').slice(-1)[0];
        return prisma.user.create({
          data: {
            schoolId: school.id,
            role: Role.PARENT,
            email: parentEmail(s.rollNumber!),
            name: `Parent (${lastName})`,
            password: parentHash,
          },
          select: { id: true },
        });
      }),
    );
    await prisma.parentLink.createMany({
      data: students.map((s, i) => ({ parentId: parents[i].id, studentId: s.id, relation: i % 2 === 0 ? 'Father' : 'Mother' })),
    });
    parentCount += parents.length;
  }
  console.log(`  ✓ ${studentCount} students + ${parentCount} parents (linked)`);

  // ---- 9. ClassSubjects (which teacher teaches which subject in each section) ----
  let csCount = 0;
  for (const section of sectionRecords) {
    for (const subj of section.subjects) {
      const subjectId = subjectsById.get(subj);
      const teacherId = teacherBySubject.get(subj);
      if (!subjectId || !teacherId) continue;
      await prisma.classSubject.create({
        data: {
          schoolId: school.id,
          classId: section.classId,
          sectionId: section.id,
          subjectId,
          teacherId,
        },
      });
      csCount++;
    }
  }
  console.log(`  ✓ ${csCount} class-subject assignments`);

  // ---- 10. Timetables (one per section, 5 days × 6 periods) ----
  const PERIODS = [
    { idx: 1, start: '09:00', end: '09:45' },
    { idx: 2, start: '09:45', end: '10:30' },
    { idx: 3, start: '10:45', end: '11:30' },
    { idx: 4, start: '11:30', end: '12:15' },
    { idx: 5, start: '13:00', end: '13:45' },
    { idx: 6, start: '13:45', end: '14:30' },
  ];
  let periodCount = 0;
  for (const section of sectionRecords) {
    const tt = await prisma.timetable.create({
      data: { schoolId: school.id, sectionId: section.id },
    });
    const periods: any[] = [];
    for (let day = 0; day < 5; day++) {
      for (let p = 0; p < PERIODS.length; p++) {
        const subj = section.subjects[(day + p) % section.subjects.length];
        periods.push({
          timetableId: tt.id,
          dayOfWeek: day,
          periodIndex: PERIODS[p].idx,
          startTime: PERIODS[p].start,
          endTime: PERIODS[p].end,
          subjectId: subjectsById.get(subj) ?? null,
          teacherId: teacherBySubject.get(subj) ?? null,
        });
      }
    }
    await prisma.timetablePeriod.createMany({ data: periods });
    periodCount += periods.length;
  }
  console.log(`  ✓ Timetable: ${periodCount} period slots filled`);

  // ---- 11. Attendance for last 30 weekdays ----
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  let attendanceCount = 0;
  // Pick a marker teacher per section = class teacher
  const sectionClassTeachers = new Map<string, string>();
  const sectionRows = await prisma.section.findMany({ where: { schoolId: school.id } });
  sectionRows.forEach((s) => s.classTeacherId && sectionClassTeachers.set(s.id, s.classTeacherId));

  for (const section of sectionRecords) {
    const markedBy = sectionClassTeachers.get(section.id) ?? teachers[0].id;
    const records: any[] = [];
    for (let d = 0; d < ATTENDANCE_DAYS; d++) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - d);
      const dow = day.getUTCDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      for (const stu of section.students) {
        const roll = rand();
        let status: AttendanceStatus = AttendanceStatus.PRESENT;
        if (roll < 0.04) status = AttendanceStatus.ABSENT;
        else if (roll < 0.07) status = AttendanceStatus.LATE;
        else if (roll < 0.08) status = AttendanceStatus.HALF_DAY;
        records.push({
          schoolId: school.id,
          sectionId: section.id,
          studentId: stu.id,
          date: day,
          status,
          markedById: markedBy,
        });
      }
    }
    await prisma.attendanceRecord.createMany({ data: records, skipDuplicates: true });
    attendanceCount += records.length;
  }
  console.log(`  ✓ ${attendanceCount} attendance records (${ATTENDANCE_DAYS}-day window, weekdays only)`);

  // ---- 12. Exams + published marks ----
  // For each section, create 2 exams (Mid-term Maths + Mid-term English where applicable)
  // mark them, publish them, so report cards have content.
  function gradeOf(pct: number) {
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A'; if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';  if (pct >= 50) return 'C'; if (pct >= 40) return 'D';
    return 'F';
  }
  let examCount = 0, markCount = 0;
  const examSubjects = ['Mathematics', 'English'];
  for (const section of sectionRecords) {
    for (const subjName of examSubjects) {
      if (!section.subjects.includes(subjName)) continue;
      const subjectId = subjectsById.get(subjName);
      const enteredBy = sectionClassTeachers.get(section.id) ?? teachers[0].id;
      const exam = await prisma.exam.create({
        data: {
          schoolId: school.id,
          academicYearId: year.id,
          name: `Mid-term ${subjName}`,
          type: ExamType.MID_TERM,
          classId: section.classId,
          subjectId,
          maxMarks: 100,
          date: new Date(today.getTime() - 7 * 86400_000),
          publishedAt: new Date(),
        },
      });
      examCount++;
      const marks = section.students.map((stu) => {
        const m = Math.round(35 + rand() * 60); // 35–95
        return {
          schoolId: school.id,
          examId: exam.id,
          studentId: stu.id,
          subjectId,
          marks: m,
          grade: gradeOf(m),
          enteredById: enteredBy,
        };
      });
      await prisma.examMark.createMany({ data: marks });
      markCount += marks.length;
    }
  }
  console.log(`  ✓ ${examCount} published exams · ${markCount} marks rows`);

  // ---- 13. Feed posts (school-wide + class-specific) ----
  const principal = await prisma.user.findFirstOrThrow({
    where: { schoolId: school.id, role: Role.SUPER_ADMIN },
  });
  const adminId = principal.id;

  const schoolWidePosts = [
    { type: PostType.ANNOUNCEMENT, title: 'Welcome to AY 2026-27', body: 'A new academic year begins! Wishing all students and staff a productive year ahead.', pin: true },
    { type: PostType.EVENT,        title: 'Annual Sports Day on May 25', body: 'Inter-house sports day will be held on May 25. Trials begin next Monday.' },
    { type: PostType.NOTICE,       title: 'Library timings updated',     body: 'Library will now stay open till 6 pm on weekdays.' },
    { type: PostType.ANNOUNCEMENT, title: 'Parent-Teacher Meet — June 2', body: 'PTM for all grades scheduled on Saturday, June 2 at 10 am.' },
  ];
  for (const p of schoolWidePosts) {
    await prisma.post.create({
      data: {
        schoolId: school.id, authorId: adminId,
        scope: PostScope.SCHOOL, type: p.type,
        title: p.title, body: p.body,
        isPinned: !!p.pin, publishedAt: new Date(),
      },
    });
  }

  const classPostTemplates = [
    { type: PostType.HOMEWORK,      title: 'Math homework — chapter 4', body: 'Solve exercises 4.1–4.3. Due by Friday.' },
    { type: PostType.TEST_REMINDER, title: 'Surprise quiz on Monday',   body: 'Pop quiz on last week’s topics. Be prepared.' },
    { type: PostType.NOTICE,        title: 'Carry your geometry box',   body: 'From tomorrow’s class onwards, geometry box is mandatory.' },
  ];
  let postCount = schoolWidePosts.length;
  for (const section of sectionRecords) {
    const teacherId = sectionClassTeachers.get(section.id) ?? teachers[0].id;
    for (const tpl of classPostTemplates) {
      await prisma.post.create({
        data: {
          schoolId: school.id, authorId: teacherId,
          scope: PostScope.CLASS, sectionId: section.id, type: tpl.type,
          title: tpl.title, body: tpl.body,
          publishedAt: new Date(Date.now() - Math.floor(rand() * 5) * 86400_000),
        },
      });
      postCount++;
    }
  }
  console.log(`  ✓ ${postCount} feed posts`);

  // ---- 14. Assignments + Submissions ----
  let assignmentCount = 0, submissionCount = 0;
  for (const section of sectionRecords) {
    const teacherId = sectionClassTeachers.get(section.id) ?? teachers[0].id;
    const post = await prisma.post.create({
      data: {
        schoolId: school.id, authorId: teacherId,
        scope: PostScope.CLASS, sectionId: section.id,
        type: PostType.ASSIGNMENT,
        title: 'Essay: My favourite season',
        body: '300-word essay describing your favourite season and why. Submit via the portal.',
        publishedAt: new Date(Date.now() - 4 * 86400_000),
      },
    });
    const assignment = await prisma.assignment.create({
      data: {
        postId: post.id,
        dueAt: new Date(Date.now() + 3 * 86400_000),
        maxMarks: 10,
        allowLate: true,
      },
    });
    assignmentCount++;

    // ~70% of students submit, half of those are graded
    for (const stu of section.students) {
      if (!chance(0.7)) continue;
      const isGraded = chance(0.5);
      const grade = isGraded ? Math.round(5 + rand() * 5) : null;
      await prisma.submission.create({
        data: {
          schoolId: school.id,
          assignmentId: assignment.id,
          studentId: stu.id,
          body: `Submission by ${stu.name}. (Seeded demo content.)`,
          submittedAt: new Date(Date.now() - Math.floor(rand() * 3) * 86400_000),
          status: isGraded ? SubmissionStatus.GRADED : SubmissionStatus.SUBMITTED,
          ...(isGraded && { grade, gradedById: teacherId, gradedAt: new Date(), feedback: 'Good effort.' }),
        },
      });
      submissionCount++;
    }
  }
  console.log(`  ✓ ${assignmentCount} assignments · ${submissionCount} submissions`);

  // =====================================================================
  // CREDENTIALS HANDOVER
  // =====================================================================
  const sampleStudents = sectionRecords
    .filter((s) => ['9A', '10A', '11SCI-M', '12COMM'].includes(`${s.grade}${s.name}`))
    .map((s) => s.students[0]);

  console.log('\n' + '═'.repeat(70));
  console.log(`🎓  EduFlow demo school is ready — ${SCHOOL_NAME}`);
  console.log('═'.repeat(70));
  console.log(`\n  Subdomain:  ${SUB}`);
  console.log(`  Web URL:    your Vercel URL  (sign in form uses subdomain "${SUB}")`);
  console.log('\nPRINCIPAL (full access)');
  console.log(`  ${PRINCIPAL_EMAIL}`);
  console.log(`  password: ${PRINCIPAL_PASSWORD}`);

  console.log('\nTEACHERS  (12 total — password for all is "teacher123")');
  for (const t of TEACHERS) {
    console.log(`  ${(t.first + ' ' + t.last).padEnd(20)}  ${teacherEmail(t).padEnd(40)}  teaches ${t.subject}`);
  }

  console.log('\nSAMPLE STUDENTS  (password for all 300 is "student123")');
  for (const s of sampleStudents) {
    if (!s) continue;
    console.log(`  ${s.name.padEnd(22)}  Roll ${s.rollNumber.padEnd(10)}  ${studentEmail(s.rollNumber).padEnd(40)}`);
  }

  console.log('\nSAMPLE PARENTS  (password for all is "parent123", or use email-OTP login)');
  for (const s of sampleStudents) {
    if (!s) continue;
    console.log(`  parent of ${s.name.padEnd(22)}  ${parentEmail(s.rollNumber)}`);
  }
  console.log('\n  Tip: every student has a paired parent at p.<rollnumber>@…');
  console.log('═'.repeat(70) + '\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
