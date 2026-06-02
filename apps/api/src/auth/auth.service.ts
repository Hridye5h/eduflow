import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, randomOtp, sha256, verifyPassword } from '../common/hash';
import { LoginDto, RegisterSchoolDto, RequestOtpDto, VerifyOtpDto } from './dto';
import { EmailService } from '../email/email.service';
import { TestOtpStore } from '../_test-helpers/test-otp.store';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async registerSchool(dto: RegisterSchoolDto) {
    const exists = await this.prisma.school.findUnique({ where: { subdomain: dto.subdomain } });
    if (exists) throw new BadRequestException('Subdomain already taken');

    const school = await this.prisma.school.create({
      data: {
        name: dto.schoolName,
        subdomain: dto.subdomain.toLowerCase(),
        board: dto.board ?? 'CBSE',
      },
    });

    const password = await hashPassword(dto.adminPassword);
    const admin = await this.prisma.user.create({
      data: {
        schoolId: school.id,
        role: Role.SUPER_ADMIN,
        name: dto.adminName,
        email: dto.adminEmail,
        password,
      },
    });

    return { school, accessToken: await this.signToken(admin) };
  }

  async loginWithPassword(dto: LoginDto) {
    const school = await this.prisma.school.findUnique({ where: { subdomain: dto.subdomain } });
    if (!school) throw new UnauthorizedException('Unknown school');

    const user = await this.prisma.user.findFirst({
      where: { schoolId: school.id, email: dto.email, isActive: true },
    });
    if (!user || !user.password || !(await verifyPassword(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { accessToken: await this.signToken(user), user: this.publicUser(user) };
  }

  async requestOtp(dto: RequestOtpDto) {
    const school = await this.prisma.school.findUnique({ where: { subdomain: dto.subdomain } });
    if (!school) throw new BadRequestException('Unknown school');

    const code = randomOtp(6);
    await this.prisma.otpCode.create({
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
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const school = await this.prisma.school.findUnique({ where: { subdomain: dto.subdomain } });
    if (!school) throw new UnauthorizedException('Unknown school');

    const otp = await this.prisma.otpCode.findFirst({
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

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

    const isEmail = dto.identifier.includes('@');
    const user = await this.prisma.user.findFirst({
      where: {
        schoolId: school.id,
        isActive: true,
        ...(isEmail ? { email: dto.identifier } : { phone: dto.identifier }),
      },
    });
    if (!user) throw new UnauthorizedException('No matching account');

    return { accessToken: await this.signToken(user), user: this.publicUser(user) };
  }

  async myChildren(userId: string) {
    const links = await this.prisma.parentLink.findMany({
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
  }

  private signToken(user: { id: string; role: Role; schoolId: string }) {
    return this.jwt.signAsync({ sub: user.id, role: user.role, schoolId: user.schoolId });
  }

  private publicUser(u: any) {
    const { password, ...rest } = u;
    return rest;
  }
}
