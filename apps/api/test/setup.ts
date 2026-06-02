import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export async function bootstrapTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Wipes the DB between tests. Order respects FK constraints. */
export async function resetDb(prisma: PrismaService) {
  // delete in reverse-FK order
  await prisma.auditLog.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.timetableSubstitution.deleteMany();
  await prisma.timetablePeriod.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatMember.deleteMany();
  await prisma.chatGroup.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.examMark.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.leaveApplication.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.parentLink.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.school.deleteMany();
}

export async function registerSchool(app: any, opts: { sub: string; name?: string }) {
  const req = require('supertest');
  const res = await req(app.getHttpServer())
    .post('/auth/register-school')
    .send({
      schoolName: opts.name ?? `Test ${opts.sub}`,
      subdomain: opts.sub,
      adminName: 'Admin',
      adminEmail: `admin@${opts.sub}.test`,
      adminPassword: 'pw123456',
    })
    .expect(201);
  return res.body; // { school, accessToken }
}
