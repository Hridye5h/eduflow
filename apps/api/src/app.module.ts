import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './common/tenant.middleware';

import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { ClassesModule } from './classes/classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FeedModule } from './feed/feed.module';
import { MarksModule } from './marks/marks.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { TimetableModule } from './timetable/timetable.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { FeesModule } from './fees/fees.module';
import { UploadsModule } from './uploads/uploads.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { ConsentModule } from './consent/consent.module';
import { ProvenanceModule } from './provenance/provenance.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { DunningModule } from './dunning/dunning.module';
import { RazorpayModule } from './razorpay/razorpay.module';
import { GradingModule } from './grading/grading.module';
import { LlmModule } from './llm/llm.module';
import { TestHelpersModule } from './_test-helpers/test-helpers.module';

const testHelpers = process.env.ENABLE_TEST_HELPERS === 'true' ? [TestHelpersModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    LlmModule,
    HealthModule,
    EmailModule,
    UploadsModule,
    AuthModule,
    SchoolsModule,
    ClassesModule,
    AttendanceModule,
    FeedModule,
    MarksModule,
    AssignmentsModule,
    TimetableModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    ChatModule,
    FeesModule,
    ProvenanceModule,
    ConsentModule,
    DunningModule,
    WhatsAppModule,
    RazorpayModule,
    GradingModule,
    ...testHelpers,
  ],
  // Activate the ThrottlerModule globally (it was registered but never enforced).
  // Rate-limits every route; the auth/OTP routes tighten this further.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
