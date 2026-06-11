import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AccessUser {
  sub: string;
  role: Role;
}

/**
 * Authorize a read of one student's data. RLS already scopes everything to the
 * caller's school; this adds the *within-school* ownership rule so a STUDENT
 * can't read another student's report card / fees / attendance by changing the
 * id in the URL, and a PARENT can only read their linked children. Staff
 * (SUPER_ADMIN / TEACHER) may read any student in their own school.
 */
export async function assertStudentAccess(
  prisma: PrismaService,
  user: AccessUser,
  studentId: string,
): Promise<void> {
  if (user.role === Role.SUPER_ADMIN || user.role === Role.TEACHER) return;
  if (user.role === Role.STUDENT && user.sub === studentId) return;
  if (user.role === Role.PARENT) {
    const link = await prisma.db.parentLink.findFirst({
      where: { parentId: user.sub, studentId },
      select: { id: true },
    });
    if (link) return;
  }
  throw new ForbiddenException('You are not allowed to access this student');
}
