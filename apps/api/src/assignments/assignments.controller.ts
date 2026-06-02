import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private a: AssignmentsService) {}

  @Get()
  list(@SchoolId() schoolId: string, @Query('sectionId') sectionId: string) {
    return this.a.listForSection(schoolId, sectionId);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  create(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    return this.a.create(schoolId, user.sub, body);
  }

  @Get(':id')
  detail(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.a.detail(schoolId, id);
  }

  @Get(':id/submissions')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  submissions(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.a.submissions(schoolId, id);
  }

  /** A student's own submission for one assignment (or null). */
  @Get(':id/my-submission')
  @Roles(Role.STUDENT)
  mySubmission(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.a.myStudentSubmission(schoolId, id, user.sub);
  }

  @Post(':id/submit')
  @Roles(Role.STUDENT)
  submit(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { body?: string; attachments?: any[] },
  ) {
    return this.a.submit(schoolId, id, user.sub, body);
  }

  @Post('submissions/:id/grade')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  grade(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { grade: number; feedback?: string },
  ) {
    return this.a.grade(schoolId, id, user.sub, body);
  }

  @Get(':id/duplicates')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  duplicates(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.a.duplicates(schoolId, id);
  }
}
