import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimetableController {
  constructor(private tt: TimetableService) {}

  @Get('timetable/section/:id')
  forSection(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.tt.getForSection(schoolId, id);
  }

  @Put('timetable/section/:id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  replace(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() body: { periods: any[] },
  ) {
    return this.tt.replace(schoolId, id, body.periods ?? []);
  }

  @Post('timetable/periods/:id/substitute')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  substitute(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() body: { date: string; substituteId: string; reason?: string },
  ) {
    return this.tt.addSubstitution(schoolId, id, body.date, body.substituteId, body.reason);
  }

  @Get('timetable/student/:id')
  forStudent(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.tt.forStudent(schoolId, id);
  }
}
