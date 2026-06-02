import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  getById(schoolId: string) {
    return this.prisma.school.findUniqueOrThrow({ where: { id: schoolId } });
  }

  async update(schoolId: string, data: Partial<{ name: string; logoUrl: string; address: string; phone: string; email: string }>) {
    return this.prisma.school.update({ where: { id: schoolId }, data });
  }

  async stats(schoolId: string) {
    const [students, teachers, classes, sections, todayAttendance] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.section.count({ where: { schoolId } }),
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: { schoolId, date: this.today() },
        _count: { _all: true },
      }),
    ]);
    return { students, teachers, classes, sections, todayAttendance };
  }

  private today() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
