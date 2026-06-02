import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceStatus, LeaveStatus, Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Get('section/:sectionId')
  forDate(
    @SchoolId() schoolId: string,
    @Param('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.attendance.sectionForDate(schoolId, sectionId, date);
  }

  @Post('section/:sectionId/mark')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  mark(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('sectionId') sectionId: string,
    @Body() body: { date: string; rows: Array<{ studentId: string; status: AttendanceStatus; note?: string }> },
  ) {
    return this.attendance.markBulk(schoolId, user.sub, sectionId, body.date, body.rows ?? []);
  }

  @Get('student/:studentId/month')
  studentMonth(
    @SchoolId() schoolId: string,
    @Param('studentId') studentId: string,
    @Query('month') month: string,
  ) {
    return this.attendance.studentMonth(schoolId, studentId, month);
  }

  @Get('defaulters')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  defaulters(@SchoolId() schoolId: string, @Query('threshold') threshold?: string) {
    return this.attendance.defaulters(schoolId, threshold ? Number(threshold) : 75);
  }

  // ---- Leave ----
  @Post('leaves')
  applyLeave(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Body() body: { studentId: string; fromDate: string; toDate: string; reason: string },
  ) {
    return this.attendance.applyLeave(schoolId, user.sub, body);
  }

  @Patch('leaves/:id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  decideLeave(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { decision: LeaveStatus; note?: string },
  ) {
    return this.attendance.decideLeave(schoolId, user.sub, id, body.decision, body.note);
  }

  @Get('leaves')
  listLeaves(@SchoolId() schoolId: string, @Query('status') status?: LeaveStatus) {
    return this.attendance.listLeaves(schoolId, status);
  }
}
