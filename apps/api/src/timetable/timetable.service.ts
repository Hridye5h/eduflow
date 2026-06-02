import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PeriodInput = {
  dayOfWeek: number;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectId?: string | null;
  teacherId?: string | null;
};

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async getForSection(schoolId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      include: { class: true },
    });
    if (!section) throw new NotFoundException('Section not found');

    let tt = await this.prisma.timetable.findUnique({
      where: { sectionId },
      include: { periods: { include: { subject: true } } },
    });
    if (!tt) {
      tt = await this.prisma.timetable.create({
        data: { schoolId, sectionId },
        include: { periods: { include: { subject: true } } },
      });
    }
    return { section, timetable: tt };
  }

  /** Replace the entire weekly grid atomically. */
  async replace(schoolId: string, sectionId: string, periods: PeriodInput[]) {
    const { timetable } = await this.getForSection(schoolId, sectionId);

    // detect conflicts within the new grid + across other sections same school
    const conflicts = await this.findConflicts(schoolId, sectionId, periods);
    if (conflicts.length) {
      throw new BadRequestException({
        message: 'Teacher conflicts detected',
        conflicts,
      });
    }

    await this.prisma.$transaction([
      this.prisma.timetablePeriod.deleteMany({ where: { timetableId: timetable.id } }),
      this.prisma.timetablePeriod.createMany({
        data: periods.map((p) => ({
          timetableId: timetable.id,
          dayOfWeek: p.dayOfWeek,
          periodIndex: p.periodIndex,
          startTime: p.startTime,
          endTime: p.endTime,
          subjectId: p.subjectId ?? null,
          teacherId: p.teacherId ?? null,
        })),
      }),
    ]);

    return this.getForSection(schoolId, sectionId);
  }

  async findConflicts(schoolId: string, sectionId: string, periods: PeriodInput[]) {
    // 1) conflicts inside the proposed grid (same teacher, same day, overlap)
    const overlaps: any[] = [];
    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const a = periods[i], b = periods[j];
        if (!a.teacherId || a.teacherId !== b.teacherId) continue;
        if (a.dayOfWeek !== b.dayOfWeek) continue;
        if (this.overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) {
          overlaps.push({ kind: 'internal', a, b });
        }
      }
    }

    // 2) conflicts across other sections in this school
    const teacherIds = [...new Set(periods.map((p) => p.teacherId).filter(Boolean) as string[])];
    if (!teacherIds.length) return overlaps;

    const others = await this.prisma.timetablePeriod.findMany({
      where: {
        teacherId: { in: teacherIds },
        timetable: { schoolId, sectionId: { not: sectionId } },
      },
      include: { timetable: { include: { section: { include: { class: true } } } } },
    });
    for (const p of periods) {
      if (!p.teacherId) continue;
      for (const o of others) {
        if (o.teacherId !== p.teacherId) continue;
        if (o.dayOfWeek !== p.dayOfWeek) continue;
        if (this.overlaps(p.startTime, p.endTime, o.startTime, o.endTime)) {
          overlaps.push({
            kind: 'cross-section',
            proposed: p,
            existing: {
              section: o.timetable.section.name,
              class: o.timetable.section.class.label,
              startTime: o.startTime,
              endTime: o.endTime,
            },
          });
        }
      }
    }
    return overlaps;
  }

  async addSubstitution(
    schoolId: string,
    periodId: string,
    date: string,
    substituteId: string,
    reason?: string,
  ) {
    const period = await this.prisma.timetablePeriod.findFirst({
      where: { id: periodId, timetable: { schoolId } },
    });
    if (!period) throw new NotFoundException('Period not found');
    const sub = await this.prisma.user.findFirst({
      where: { id: substituteId, schoolId, role: Role.TEACHER, isActive: true },
    });
    if (!sub) throw new BadRequestException('Substitute teacher not found');

    const day = new Date(date);
    day.setUTCHours(0, 0, 0, 0);
    return this.prisma.timetableSubstitution.upsert({
      where: { periodId_date: { periodId, date: day } },
      update: { substituteId, reason },
      create: { periodId, date: day, substituteId, reason },
    });
  }

  /** For students/parents — read-only view. */
  async forStudent(schoolId: string, studentId: string) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: Role.STUDENT },
      select: { sectionId: true },
    });
    if (!student?.sectionId) throw new NotFoundException('Student has no section');
    return this.getForSection(schoolId, student.sectionId);
  }

  private overlaps(a1: string, a2: string, b1: string, b2: string) {
    return a1 < b2 && b1 < a2;
  }
}
