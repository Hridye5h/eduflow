import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConsentMethod, Role } from '@prisma/client';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller('consent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsentController {
  constructor(private consent: ConsentService) {}

  @Post('request')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  request(
    @SchoolId() schoolId: string,
    @Body() body: { studentId: string; guardianId?: string; purpose: string; scope?: string },
  ) {
    return this.consent.request({ schoolId, ...body });
  }

  @Post('grant')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  grant(
    @SchoolId() schoolId: string,
    @Body()
    body: {
      studentId: string;
      guardianId: string;
      purpose: string;
      scope?: string;
      method: ConsentMethod;
      phone?: string;
      callbackPayload?: Record<string, unknown>;
    },
  ) {
    return this.consent.grantViaVerifier({
      schoolId,
      studentId: body.studentId,
      guardianId: body.guardianId,
      purpose: body.purpose,
      scope: body.scope,
      method: body.method,
      verify: { guardianId: body.guardianId, phone: body.phone, callbackPayload: body.callbackPayload },
    });
  }

  @Post('withdraw')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER, Role.PARENT)
  withdraw(
    @SchoolId() schoolId: string,
    @Body() body: { studentId: string; purpose: string; guardianId?: string; note?: string },
  ) {
    return this.consent.withdraw({ schoolId, ...body });
  }

  @Post('paper')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  paper(
    @SchoolId() schoolId: string,
    @Body() body: { studentId: string; purpose: string; note?: string },
  ) {
    return this.consent.attachSupplementaryPaper({ schoolId, ...body });
  }

  @Get('status/:studentId')
  async status(@Param('studentId') studentId: string, @Query('purpose') purpose: string) {
    const state = await this.consent.getState(studentId, purpose);
    return { studentId, purpose, status: state };
  }

  @Get('history/:studentId')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  history(@Param('studentId') studentId: string) {
    return this.consent.history(studentId);
  }
}
