import { Injectable } from '@nestjs/common';
import { AttendanceStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async attendanceSummary(schoolId: string, days = 30) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, date: { gte: since } },
      select: { date: true, status: true },
    });

    const byDay = new Map<string, Record<string, number>>();
    for (const r of records) {
      const key = r.date.toISOString().slice(0, 10);
      const day = byDay.get(key) ?? {};
      day[r.status] = (day[r.status] ?? 0) + 1;
      byDay.set(key, day);
    }

    const series = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => {
        const present = (counts[AttendanceStatus.PRESENT] ?? 0) + (counts[AttendanceStatus.LATE] ?? 0);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return {
          date,
          present,
          absent: counts[AttendanceStatus.ABSENT] ?? 0,
          late: counts[AttendanceStatus.LATE] ?? 0,
          percentage: total ? Math.round((present / total) * 100) : 0,
        };
      });

    return { since: since.toISOString().slice(0, 10), series };
  }

  async marksSummary(schoolId: string) {
    const exams = await this.prisma.exam.findMany({
      where: { schoolId, publishedAt: { not: null } },
      include: { marks: { select: { marks: true } }, class: { select: { label: true } } },
      orderBy: { date: 'desc' },
      take: 20,
    });
    return exams.map((e) => {
      const vals = e.marks.map((m) => m.marks);
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return {
        examId: e.id,
        name: e.name,
        class: e.class.label,
        students: vals.length,
        maxMarks: e.maxMarks,
        averagePct: e.maxMarks ? Math.round((avg / e.maxMarks) * 100) : 0,
      };
    });
  }

  async atRisk(schoolId: string, attendanceThreshold = 75, marksThresholdPct = 40) {
    // attendance side
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, date: { gte: since } },
      select: { studentId: true, status: true },
    });
    const attendance = new Map<string, { total: number; present: number }>();
    for (const r of records) {
      const t = attendance.get(r.studentId) ?? { total: 0, present: 0 };
      t.total++;
      if (r.status === 'PRESENT' || r.status === 'LATE') t.present++;
      else if (r.status === 'HALF_DAY') t.present += 0.5;
      attendance.set(r.studentId, t);
    }

    // marks side — last 5 exams average
    const marks = await this.prisma.examMark.findMany({
      where: { schoolId, exam: { publishedAt: { not: null } } },
      select: { studentId: true, marks: true, exam: { select: { maxMarks: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const marksPct = new Map<string, number[]>();
    for (const m of marks) {
      const pct = (m.marks / m.exam.maxMarks) * 100;
      const arr = marksPct.get(m.studentId) ?? [];
      arr.push(pct);
      marksPct.set(m.studentId, arr);
    }

    const flagged: any[] = [];
    const allStudentIds = new Set([...attendance.keys(), ...marksPct.keys()]);
    for (const sid of allStudentIds) {
      const att = attendance.get(sid);
      const m = marksPct.get(sid);
      const attPct = att ? Math.round((att.present / att.total) * 100) : null;
      const avgMarks = m && m.length ? Math.round(m.reduce((a, b) => a + b, 0) / m.length) : null;
      const reasons: string[] = [];
      if (attPct !== null && attPct < attendanceThreshold) reasons.push(`attendance ${attPct}%`);
      if (avgMarks !== null && avgMarks < marksThresholdPct) reasons.push(`marks avg ${avgMarks}%`);
      if (reasons.length) flagged.push({ studentId: sid, attendancePct: attPct, avgMarksPct: avgMarks, reasons });
    }

    const ids = flagged.map((f) => f.studentId);
    const students = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, rollNumber: true, sectionId: true },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    return flagged.map((f) => ({ ...f, student: byId.get(f.studentId) })).sort((a, b) => (a.attendancePct ?? 100) - (b.attendancePct ?? 100));
  }

  async teacherActivity(schoolId: string) {
    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: Role.TEACHER, isActive: true },
      select: { id: true, name: true },
    });

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const result = await Promise.all(
      teachers.map(async (t) => {
        const [posts, marksEntered, attendanceMarked] = await Promise.all([
          this.prisma.post.count({ where: { schoolId, authorId: t.id, createdAt: { gte: since } } }),
          this.prisma.examMark.count({ where: { schoolId, enteredById: t.id, createdAt: { gte: since } } }),
          this.prisma.attendanceRecord.count({ where: { schoolId, markedById: t.id, createdAt: { gte: since } } }),
        ]);
        return { teacher: t, posts, marksEntered, attendanceMarked };
      }),
    );

    return result.sort((a, b) => (b.posts + b.marksEntered + b.attendanceMarked) - (a.posts + a.marksEntered + a.attendanceMarked));
  }
}
