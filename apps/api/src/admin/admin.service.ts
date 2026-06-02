import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../common/hash';

type NewUser = {
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  sectionId?: string;
  rollNumber?: string;
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(schoolId: string, role?: Role, search?: string) {
    return this.prisma.user.findMany({
      where: {
        schoolId,
        ...(role && { role }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      select: {
        id: true, role: true, name: true, email: true, phone: true,
        isActive: true, rollNumber: true, sectionId: true, createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 500,
    });
  }

  async createUser(schoolId: string, dto: NewUser) {
    if (!dto.email && !dto.phone) throw new BadRequestException('email or phone required');
    const password = dto.password ? await hashPassword(dto.password) : undefined;
    return this.prisma.user.create({
      data: {
        schoolId,
        role: dto.role,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password,
        sectionId: dto.role === Role.STUDENT ? dto.sectionId : undefined,
        rollNumber: dto.role === Role.STUDENT ? dto.rollNumber : undefined,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async bulkImportUsers(schoolId: string, role: Role, rows: NewUser[]) {
    const created = await this.prisma.$transaction(
      rows.map((r) => this.prisma.user.create({
        data: {
          schoolId,
          role,
          name: r.name,
          email: r.email,
          phone: r.phone,
          sectionId: role === Role.STUDENT ? r.sectionId : undefined,
          rollNumber: role === Role.STUDENT ? r.rollNumber : undefined,
        },
        select: { id: true },
      })),
    );
    return { imported: created.length };
  }

  async setActive(schoolId: string, userId: string, isActive: boolean) {
    return this.prisma.user.updateMany({
      where: { id: userId, schoolId },
      data: { isActive },
    });
  }

  async updateUser(schoolId: string, userId: string, data: Partial<NewUser>) {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = data.email;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.rollNumber !== undefined) patch.rollNumber = data.rollNumber;
    if (data.sectionId !== undefined) patch.sectionId = data.sectionId;
    if (data.password) patch.password = await hashPassword(data.password);
    return this.prisma.user.updateMany({ where: { id: userId, schoolId }, data: patch });
  }

  async linkParent(schoolId: string, parentId: string, studentId: string, relation?: string) {
    // confirm both rows belong to the school
    const [parent, student] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: parentId, schoolId, role: Role.PARENT } }),
      this.prisma.user.findFirst({ where: { id: studentId, schoolId, role: Role.STUDENT } }),
    ]);
    if (!parent || !student) throw new BadRequestException('Parent or student not found in this school');
    return this.prisma.parentLink.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: { relation },
      create: { parentId, studentId, relation },
    });
  }

  listSubjects(schoolId: string) {
    return this.prisma.subject.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
  }

  createSubject(schoolId: string, name: string, code?: string) {
    return this.prisma.subject.create({ data: { schoolId, name, code } });
  }

  // ---- audit log ----
  async record(
    schoolId: string,
    actorId: string | null,
    action: string,
    entity: string,
    entityId?: string,
    diff?: any,
    ip?: string,
    ua?: string,
  ) {
    return this.prisma.auditLog.create({
      data: { schoolId, actorId, action, entity, entityId, diffJson: diff, ip, userAgent: ua },
    });
  }

  listAudit(schoolId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      include: { actor: { select: { id: true, name: true, role: true } } },
    });
  }
}
