import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private classes: ClassesService) {}

  @Get('classes')
  list(@SchoolId() schoolId: string, @Query('academicYearId') yearId?: string) {
    return this.classes.listClasses(schoolId, yearId);
  }

  @Post('classes')
  @Roles(Role.SUPER_ADMIN)
  create(
    @SchoolId() schoolId: string,
    @Body() body: { grade: number; label?: string },
  ) {
    return this.classes.createClass(schoolId, body.grade, body.label);
  }

  @Post('classes/:classId/sections')
  @Roles(Role.SUPER_ADMIN)
  createSection(
    @SchoolId() schoolId: string,
    @Param('classId') classId: string,
    @Body() body: { name: string; classTeacherId?: string },
  ) {
    return this.classes.createSection(schoolId, classId, body.name, body.classTeacherId);
  }

  @Post('sections/:sectionId/class-teacher')
  @Roles(Role.SUPER_ADMIN)
  assignTeacher(
    @SchoolId() schoolId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { teacherId: string },
  ) {
    return this.classes.assignClassTeacher(schoolId, sectionId, body.teacherId);
  }

  @Get('sections/:sectionId/students')
  roster(@SchoolId() schoolId: string, @Param('sectionId') sectionId: string) {
    return this.classes.roster(schoolId, sectionId);
  }

  @Post('sections/:sectionId/students')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  addStudent(
    @SchoolId() schoolId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { name: string; rollNumber?: string; email?: string; phone?: string },
  ) {
    return this.classes.addStudent(schoolId, sectionId, body);
  }

  @Post('sections/:sectionId/students/import')
  @Roles(Role.SUPER_ADMIN)
  bulkImport(
    @SchoolId() schoolId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { rows: Array<{ name: string; rollNumber?: string; email?: string; phone?: string }> },
  ) {
    return this.classes.bulkImportStudents(schoolId, sectionId, body.rows ?? []);
  }

  @Post('students/:studentId/transfer')
  @Roles(Role.SUPER_ADMIN)
  transfer(
    @SchoolId() schoolId: string,
    @Param('studentId') studentId: string,
    @Body() body: { toSectionId: string },
  ) {
    return this.classes.transferStudent(schoolId, studentId, body.toSectionId);
  }
}
