import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TEACHER)
export class ReportsController {
  constructor(private r: ReportsService) {}

  @Get('attendance')
  attendance(@SchoolId() schoolId: string, @Query('days') days?: string) {
    return this.r.attendanceSummary(schoolId, days ? Number(days) : 30);
  }

  @Get('marks')
  marks(@SchoolId() schoolId: string) {
    return this.r.marksSummary(schoolId);
  }

  @Get('at-risk')
  atRisk(
    @SchoolId() schoolId: string,
    @Query('attendance') att?: string,
    @Query('marks') marks?: string,
  ) {
    return this.r.atRisk(schoolId, att ? Number(att) : 75, marks ? Number(marks) : 40);
  }

  @Get('teacher-activity')
  teacherActivity(@SchoolId() schoolId: string) {
    return this.r.teacherActivity(schoolId);
  }
}
