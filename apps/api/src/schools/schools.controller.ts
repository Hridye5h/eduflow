import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(private schools: SchoolsService) {}

  @Get()
  current(@SchoolId() schoolId: string) {
    return this.schools.getById(schoolId);
  }

  @Get('stats')
  stats(@SchoolId() schoolId: string) {
    return this.schools.stats(schoolId);
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN)
  update(@SchoolId() schoolId: string, @Body() body: any) {
    return this.schools.update(schoolId, body);
  }
}
