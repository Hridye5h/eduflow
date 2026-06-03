import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, randomOtp, sha256, verifyPassword } from '../common/hash';
import { LoginDto, RegisterSchoolDto, RequestOtpDto, VerifyOtpDto } from './dto';
import { EmailService } from '../email/email.service';
import { TestOtpStore } from '../_test-helpers/test-otp.store';

/**
 * Auth is the trusted tenant *resolver*: it runs before a tenant context exists
 * (signup creates a brand-new tenant; login resolves the school from the
 * subdomain itself) and always scopes its queries by an explicit `schoolId`.
 * Its DB work therefore runs under `runAsSystem` (RLS-bypass) — the one module
 * allowed to, precisely because it is the gate that establishes identity.
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  registerSchool(dto: RegisterSchoolDto) {
    return this.prisma.runAsSystem(async () => {
      const exists = await this.prisma.db.school.findUnique({ where: { subdomain: dto.subdomain } });
      if (exists) throw new BadRequestException('Subdomain already taken');

      const school = await this.prisma.db.school.create({
        data: {
          name: dto.schoolName,
          subdomain: dto.subdomain.toLowerCase(),
          board: dto.board ?? 'CBSE',
        },
      });

      // Seed a current academic year (Indian Apr–Mar) so the dashboard works from
      // day one — classes, marks, attendance and timetable all require a current
      // year to exist, and there is no other UI to create the first one.
      const now = new Date();
      const startYear = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
      await this.prisma.db.academicYear.create({
        data: {
          schoolId: school.id,
          label: `${startYear}-${startYear + 1}`,
          startDate: new Date(Date.UTC(startYear, 3, 1)),
          endDate: new Date(Date.UTC(startYear + 1, 2, 31)),
          isCurrent: true,
        },
      });

      const password = await hashPassword(dto.adminPassword);
      const admin = await this.prisma.db.user.create({
        data: {
          schoolId: school.id,
          role: Role.SUPER_ADMIN,
          name: dto.adminName,
          email: dto.adminEmail,
          password,
        },
      });

      return { school, accessToken: await this.signToken(admin) };
    });
  }

  loginWithPassword(dto: LoginDto) {
    return this.prisma.runAsSystem(async () => {
      const school = await this.prisma.db.school.findUnique({ where: { subdomain: dto.subdomain } });
      if (!school) throw new UnauthorizedException('Unknown school');

      const user = await this.prisma.db.user.findFirst({
        where: { schoolId: school.id, email: dto.email, isActive: true },
      });
      if (!user || !user.password || !(await verifyPassword(dto.password, user.password))) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return { accessToken: await this.signToken(user), user: this.publicUser(user) };
    });
  }

  requestOtp(dto: RequestOtpDto) {
    return this.prisma.runAsSystem(async () => {
      const school = await this.prisma.db.school.findUnique({ where: { subdomain: dto.subdomain } });
      if (!school) throw new BadRequestException('Unknown school');

      const code = randomOtp(6);
      await this.prisma.db.otpCode.create({
        data: {
          schoolId: school.id,
          identifier: dto.identifier,
          codeHash: sha256(code),
          expiresAt: new Date(Date.now() + 5 * 60_000),
        },
      });

      // Test helper — stash plaintext in-memory if explicitly enabled (never in prod).
      TestOtpStore.record(dto.identifier, code);

      // Deliver: email if identifier looks like email; otherwise log (SMS provider plug-in point)
      if (dto.identifier.includes('@')) {
        await this.email.sendOtp(dto.identifier, code, school.name);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[OTP-SMS-dev] ${dto.identifier} → ${code}`);
      }
      return { ok: true };
    });
  }

  verifyOtp(dto: VerifyOtpDto) {
    return this.prisma.runAsSystem(async () => {
      const school = await this.prisma.db.school.findUnique({ where: { subdomain: dto.subdomain } });
      if (!school) throw new UnauthorizedException('Unknown school');

      const otp = await this.prisma.db.otpCode.findFirst({
        where: {
          schoolId: school.id,
          identifier: dto.identifier,
          codeHash: sha256(dto.code),
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!otp) throw new UnauthorizedException('Invalid or expired OTP');

      await this.prisma.db.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

      const isEmail = dto.identifier.includes('@');
      const user = await this.prisma.db.user.findFirst({
        where: {
          schoolId: school.id,
          isActive: true,
          ...(isEmail ? { email: dto.identifier } : { phone: dto.identifier }),
        },
      });
      if (!user) throw new UnauthorizedException('No matching account');

      return { accessToken: await this.signToken(user), user: this.publicUser(user) };
    });
  }

  myChildren(userId: string) {
    return this.prisma.runAsSystem(async () => {
      const links = await this.prisma.db.parentLink.findMany({
        where: { parentId: userId },
        include: {
          student: {
            include: {
              section: {
                include: {
                  class: { select: { id: true, label: true, grade: true } },
                  classTeacher: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      });
      return links.map((l) => {
        const { password, ...student } = l.student as any;
        return {
          parentLinkId: l.id,
          relation: l.relation,
          student,
        };
      });
    });
  }

  private signToken(user: { id: string; role: Role; schoolId: string }) {
    return this.jwt.signAsync({ sub: user.id, role: user.role, schoolId: user.schoolId });
  }

  private publicUser(u: any) {
    const { password, ...rest } = u;
    return rest;
  }
}
