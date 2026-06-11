import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { GradingService } from './grading.service';
import { ScoreItem } from './scoring';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId, CurrentUser } from '../common/tenant.decorator';

@Controller('grading')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradingController {
  constructor(private grading: GradingService) {}

  @Post('sheet')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  grade(
    @SchoolId() schoolId: string,
    @Body() body: { testName: string; studentId: string; items: ScoreItem[] },
  ) {
    return this.grading.gradeSheet({ schoolId, ...body });
  }

  @Post('sheet/:id/report')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  report(@Param('id') id: string) {
    return this.grading.generateReport(id);
  }

  /** HITL: teacher approves → report is sent to the parent via the outbox. */
  @Post('report/:id/approve')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  approve(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() body: { toPhone: string },
  ) {
    return this.grading.approveAndSend(id, user.sub, body.toPhone);
  }

  @Get('sheet/:id')
  getSheet(@Param('id') id: string) {
    return this.grading.getSheet(id);
  }

  @Get('report/:id')
  getReport(@Param('id') id: string) {
    return this.grading.getReport(id);
  }
}
