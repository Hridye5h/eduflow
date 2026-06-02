import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async listClasses(schoolId: string, academicYearId?: string) {
    const year = academicYearId ?? (await this.currentYear(schoolId)).id;
    return this.prisma.class.findMany({
      where: { schoolId, academicYearId: year },
      include: { sections: { include: { classTeacher: { select: { id: true, name: true } } } } },
      orderBy: { grade: 'asc' },
    });
  }

  async createClass(schoolId: string, grade: number, label?: string) {
    const year = await this.currentYear(schoolId);
    return this.prisma.class.create({
      data: {
        schoolId,
        academicYearId: year.id,
        grade,
        label: label ?? `Grade ${grade}`,
      },
    });
  }

  async createSection(schoolId: string, classId: string, name: string, classTeacherId?: string) {
    await this.assertClassInSchool(classId, schoolId);
    return this.prisma.section.create({
      data: { schoolId, classId, name: name.toUpperCase(), classTeacherId },
    });
  }

  async assignClassTeacher(schoolId: string, sectionId: string, teacherId: string) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId, schoolId, role: Role.TEACHER },
    });
    if (!teacher) throw new BadRequestException('Teacher not found in this school');

    return this.prisma.section.update({
      where: { id: sectionId },
      data: { classTeacherId: teacherId },
    });
  }

  async roster(schoolId: string, sectionId: string) {
    return this.prisma.user.findMany({
      where: { schoolId, sectionId, role: Role.STUDENT, isActive: true },
      select: {
        id: true,
        name: true,
        rollNumber: true,
        avatarUrl: true,
        email: true,
        phone: true,
      },
      orderBy: [{ rollNumber: 'asc' }, { name: 'asc' }],
    });
  }

  async addStudent(
    schoolId: string,
    sectionId: string,
    data: { name: string; rollNumber?: string; email?: string; phone?: string },
  ) {
    await this.assertSectionInSchool(sectionId, schoolId);
    return this.prisma.user.create({
      data: {
        schoolId,
        sectionId,
        role: Role.STUDENT,
        name: data.name,
        rollNumber: data.rollNumber,
        email: data.email,
        phone: data.phone,
      },
    });
  }

  async transferStudent(schoolId: string, studentId: string, toSectionId: string) {
    await this.assertSectionInSchool(toSectionId, schoolId);
    return this.prisma.user.update({
      where: { id: studentId },
      data: { sectionId: toSectionId },
    });
  }

  async bulkImportStudents(
    schoolId: string,
    sectionId: string,
    rows: Array<{ name: string; rollNumber?: string; email?: string; phone?: string }>,
  ) {
    await this.assertSectionInSchool(sectionId, schoolId);
    const created = await this.prisma.$transaction(
      rows.map((r) =>
        this.prisma.user.create({
          data: {
            schoolId,
            sectionId,
            role: Role.STUDENT,
            name: r.name,
            rollNumber: r.rollNumber,
            email: r.email,
            phone: r.phone,
          },
          select: { id: true, name: true, rollNumber: true },
        }),
      ),
    );
    return { imported: created.length, students: created };
  }

  private async currentYear(schoolId: string) {
    const year =
      (await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
      })) ??
      (await this.prisma.academicYear.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
      }));
    if (!year) throw new BadRequestException('No academic year configured');
    return year;
  }

  private async assertClassInSchool(classId: string, schoolId: string) {
    const c = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!c) throw new NotFoundException('Class not found in this school');
  }

  private async assertSectionInSchool(sectionId: string, schoolId: string) {
    const s = await this.prisma.section.findFirst({ where: { id: sectionId, schoolId } });
    if (!s) throw new NotFoundException('Section not found in this school');
  }
}
