import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ChatScope, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /** List groups visible to this user. */
  async myGroups(schoolId: string, user: { sub: string; role: Role }) {
    if (user.role === Role.SUPER_ADMIN) {
      return this.prisma.chatGroup.findMany({
        where: { schoolId },
        include: { section: { include: { class: true } }, _count: { select: { messages: true } } },
        orderBy: { createdAt: 'asc' },
      });
    }
    return this.prisma.chatGroup.findMany({
      where: {
        schoolId,
        OR: [
          { members: { some: { userId: user.sub } } },
          // students/teachers/parents auto-see their section's group
          ...(await this.autoMembershipFilters(user.sub)),
        ],
      },
      include: { section: { include: { class: true } }, _count: { select: { messages: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOrCreateSectionGroup(schoolId: string, sectionId: string) {
    const existing = await this.prisma.chatGroup.findFirst({
      where: { schoolId, sectionId, scope: ChatScope.GROUP },
    });
    if (existing) return existing;

    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      include: { class: true },
    });
    if (!section) throw new BadRequestException('Section not found');

    return this.prisma.chatGroup.create({
      data: {
        schoolId,
        sectionId,
        scope: ChatScope.GROUP,
        name: `${section.class.label} — Section ${section.name}`,
      },
    });
  }

  async messages(schoolId: string, groupId: string, before?: string, limit = 50) {
    return this.prisma.chatMessage.findMany({
      where: {
        schoolId,
        groupId,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  async send(
    schoolId: string,
    groupId: string,
    authorId: string,
    body: string,
  ) {
    if (!body?.trim()) throw new BadRequestException('Empty message');

    const group = await this.prisma.chatGroup.findFirst({
      where: { id: groupId, schoolId },
      include: { section: true },
    });
    if (!group) throw new ForbiddenException('Group not found');

    // student-to-student restriction
    if (!group.studentToStudent) {
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { role: true },
      });
      if (author?.role === Role.STUDENT) {
        // students may only message teachers; check there's at least one teacher in group/section
        // (simple guard — pilot)
        if (!group.sectionId) throw new ForbiddenException('Students can only message section groups');
      }
    }

    return this.prisma.chatMessage.create({
      data: { schoolId, groupId, authorId, body },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async toggleStudentToStudent(schoolId: string, groupId: string, enabled: boolean) {
    return this.prisma.chatGroup.updateMany({
      where: { id: groupId, schoolId },
      data: { studentToStudent: enabled },
    });
  }

  /** Direct message — find-or-create a private 2-person group. */
  async directWith(schoolId: string, meId: string, otherId: string) {
    if (meId === otherId) throw new BadRequestException('Cannot DM yourself');
    const existing = await this.prisma.chatGroup.findFirst({
      where: {
        schoolId,
        scope: ChatScope.DIRECT,
        members: { every: { userId: { in: [meId, otherId] } } },
      },
      include: { members: true },
    });
    if (existing && existing.members.length === 2) return existing;

    return this.prisma.chatGroup.create({
      data: {
        schoolId,
        scope: ChatScope.DIRECT,
        members: { createMany: { data: [{ userId: meId }, { userId: otherId }] } },
      },
    });
  }

  private async autoMembershipFilters(userId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, sectionId: true },
    });
    if (!me) return [];
    if (me.role === Role.STUDENT && me.sectionId) {
      return [{ sectionId: me.sectionId, scope: ChatScope.GROUP }] as any[];
    }
    if (me.role === Role.TEACHER) {
      // teachers see sections where they're the class teacher or a subject teacher
      const sections = await this.prisma.section.findMany({
        where: {
          OR: [
            { classTeacherId: userId },
            { classSubjects: { some: { teacherId: userId } } },
          ],
        },
        select: { id: true },
      });
      return sections.length
        ? [{ sectionId: { in: sections.map((s) => s.id) }, scope: ChatScope.GROUP }]
        : [];
    }
    if (me.role === Role.PARENT) {
      const links = await this.prisma.parentLink.findMany({
        where: { parentId: userId },
        include: { student: { select: { sectionId: true } } },
      });
      const ids = links.map((l) => l.student.sectionId).filter(Boolean) as string[];
      return ids.length ? [{ sectionId: { in: ids }, scope: ChatScope.GROUP }] : [];
    }
    return [];
  }
}
