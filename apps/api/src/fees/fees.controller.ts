import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private fees: FeesService) {}

  @Get('structures')
  list(@SchoolId() schoolId: string, @Query('classId') classId?: string) {
    return this.fees.listStructures(schoolId, classId);
  }

  @Post('structures')
  @Roles(Role.SUPER_ADMIN)
  create(
    @SchoolId() schoolId: string,
    @Body() body: { classId: string; name: string; amount: number; dueDate?: string; isMandatory?: boolean },
  ) {
    return this.fees.createStructure(schoolId, body);
  }

  @Get('class/:classId')
  forClass(@SchoolId() schoolId: string, @Param('classId') classId: string) {
    return this.fees.listForClass(schoolId, classId);
  }

  @Get('student/:studentId')
  forStudent(@SchoolId() schoolId: string, @Param('studentId') studentId: string) {
    return this.fees.forStudent(schoolId, studentId);
  }

  @Post('payments/:id')
  @Roles(Role.SUPER_ADMIN)
  record(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() body: { amount: number; txnRef?: string; receiptUrl?: string },
  ) {
    return this.fees.recordPayment(schoolId, id, body);
  }

  @Post('overdue-remind')
  @Roles(Role.SUPER_ADMIN)
  remind(@SchoolId() schoolId: string) {
    return this.fees.overdueRemind(schoolId);
  }

  @Get('summary')
  @Roles(Role.SUPER_ADMIN)
  summary(@SchoolId() schoolId: string) {
    return this.fees.summary(schoolId);
  }
}
