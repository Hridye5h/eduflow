import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ExamType, Role } from '@prisma/client';
import { MarksService } from './marks.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarksController {
  constructor(private marks: MarksService) {}

  @Get('exams')
  list(@SchoolId() schoolId: string, @Query('classId') classId?: string) {
    return this.marks.listExams(schoolId, classId);
  }

  @Post('exams')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  create(
    @SchoolId() schoolId: string,
    @Body() body: { name: string; type: ExamType; classId: string; subjectId?: string; maxMarks: number; passMarks?: number; date?: string },
  ) {
    return this.marks.createExam(schoolId, body);
  }

  @Get('exams/:id')
  get(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.marks.getExam(schoolId, id);
  }

  @Post('exams/:id/marks')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  enter(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { rows: Array<{ studentId: string; subjectId?: string; marks: number; remarks?: string }> },
  ) {
    return this.marks.enterMarks(schoolId, id, user.sub, body.rows ?? []);
  }

  @Post('exams/:id/publish')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  publish(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.marks.publishExam(schoolId, id);
  }

  @Get('exams/:id/summary')
  summary(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.marks.classSummary(schoolId, id);
  }

  @Get('students/:id/report-card')
  reportCard(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Query('academicYearId') yearId?: string,
  ) {
    return this.marks.studentReport(schoolId, id, yearId);
  }
}
