import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AttendanceStatus, LeaveStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type MarkRow = { studentId: string; status: AttendanceStatus; note?: string };

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /** Idempotent — upserts one record per student/day. */
  async markBulk(
    schoolId: string,
    markedById: string,
    sectionId: string,
    date: string,
    rows: MarkRow[],
  ) {
    const day = this.toDay(date);

    const section = await this.prisma.section.findFirst({ where: { id: sectionId, schoolId } });
    if (!section) throw new BadRequestException('Section not in this school');

    const ops = rows.map((r) =>
      this.prisma.attendanceRecord.upsert({
        where: { studentId_date: { studentId: r.studentId, date: day } },
        update: { status: r.status, note: r.note, markedById },
        create: {
          schoolId,
          sectionId,
          studentId: r.studentId,
          date: day,
          status: r.status,
          note: r.note,
          markedById,
        },
      }),
    );
    const saved = await this.prisma.$transaction(ops);

    // emit absent-notifications (queued in a real system)
    const absent = saved.filter((s) => s.status === AttendanceStatus.ABSENT);
    if (absent.length) {
      await this.fanoutAbsenceNotifications(schoolId, absent.map((a) => a.studentId), day);
    }

    return { saved: saved.length };
  }

  async sectionForDate(schoolId: string, sectionId: string, date: string) {
    const day = this.toDay(date);
    const [students, records] = await Promise.all([
      this.prisma.user.findMany({
        where: { schoolId, sectionId, role: Role.STUDENT, isActive: true },
        select: { id: true, name: true, rollNumber: true },
        orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, sectionId, date: day },
        select: { studentId: true, status: true, note: true },
      }),
    ]);
    const byStudent = new Map(records.map((r) => [r.studentId, r]));
    return students.map((s) => ({
      ...s,
      status: byStudent.get(s.id)?.status ?? null,
      note: byStudent.get(s.id)?.note ?? null,
    }));
  }

  async studentMonth(schoolId: string, studentId: string, month: string /* YYYY-MM */) {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) throw new BadRequestException('month must be YYYY-MM');
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));

    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });

    const totals = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<AttendanceStatus, number>,
    );

    const counted = records.length || 1;
    const present =
      (totals[AttendanceStatus.PRESENT] ?? 0) +
      (totals[AttendanceStatus.LATE] ?? 0) +
      0.5 * (totals[AttendanceStatus.HALF_DAY] ?? 0);
    const percentage = Math.round((present / counted) * 100);

    return { month, records, totals, percentage };
  }

  async defaulters(schoolId: string, threshold = 75) {
    // simple rolling 30-day calc
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 30);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, date: { gte: since } },
      select: { studentId: true, status: true },
    });

    const tally = new Map<string, { total: number; present: number }>();
    for (const r of records) {
      const t = tally.get(r.studentId) ?? { total: 0, present: 0 };
      t.total++;
      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) t.present++;
      else if (r.status === AttendanceStatus.HALF_DAY) t.present += 0.5;
      tally.set(r.studentId, t);
    }

    const flagged: Array<{ studentId: string; percentage: number }> = [];
    for (const [studentId, t] of tally) {
      const pct = Math.round((t.present / t.total) * 100);
      if (pct < threshold) flagged.push({ studentId, percentage: pct });
    }

    const students = await this.prisma.user.findMany({
      where: { id: { in: flagged.map((f) => f.studentId) } },
      select: { id: true, name: true, rollNumber: true, sectionId: true },
    });
    const byId = new Map(students.map((s) => [s.id, s]));
    return flagged
      .map((f) => ({ ...f, student: byId.get(f.studentId) }))
      .sort((a, b) => a.percentage - b.percentage);
  }

  async applyLeave(
    schoolId: string,
    applicantId: string,
    data: { studentId: string; fromDate: string; toDate: string; reason: string },
  ) {
    return this.prisma.leaveApplication.create({
      data: {
        schoolId,
        applicantId,
        studentId: data.studentId,
        fromDate: this.toDay(data.fromDate),
        toDate: this.toDay(data.toDate),
        reason: data.reason,
      },
    });
  }

  async decideLeave(
    schoolId: string,
    deciderId: string,
    leaveId: string,
    decision: LeaveStatus,
    note?: string,
  ) {
    const leave = await this.prisma.leaveApplication.findFirst({
      where: { id: leaveId, schoolId },
    });
    if (!leave) throw new BadRequestException('Leave not found');

    return this.prisma.leaveApplication.update({
      where: { id: leaveId },
      data: { status: decision, decidedById: deciderId, decidedAt: new Date(), decisionNote: note },
    });
  }

  async listLeaves(schoolId: string, status?: LeaveStatus) {
    return this.prisma.leaveApplication.findMany({
      where: { schoolId, ...(status && { status }) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // ---- helpers ----

  private toDay(input: string) {
    const d = new Date(input);
    if (isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${input}`);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private async fanoutAbsenceNotifications(
    schoolId: string,
    studentIds: string[],
    day: Date,
  ) {
    if (!studentIds.length) return;
    const links = await this.prisma.parentLink.findMany({
      where: { studentId: { in: studentIds } },
      select: { parentId: true, studentId: true },
    });
    if (!links.length) return;

    await this.prisma.notification.createMany({
      data: links.map((l) => ({
        schoolId,
        userId: l.parentId,
        type: 'ATTENDANCE_ABSENT' as const,
        title: 'Absence recorded',
        body: `Your child was marked absent on ${day.toISOString().slice(0, 10)}`,
        dataJson: { studentId: l.studentId, date: day.toISOString().slice(0, 10) },
      })),
      skipDuplicates: true,
    });
  }
}
