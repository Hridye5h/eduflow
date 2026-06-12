import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SchoolsService } from './schools.service';
import { DemoSeedService } from './demo-seed.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller('school')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolsController {
  constructor(private schools: SchoolsService, private demoSeed: DemoSeedService) {}

  @Get()
  current(@SchoolId() schoolId: string) {
    return this.schools.getById(schoolId);
  }

  @Get('stats')
  stats(@SchoolId() schoolId: string) {
    return this.schools.stats(schoolId);
  }

  /** One-click sample data for an empty school — see DemoSeedService. */
  @Post('demo-data')
  @Roles(Role.SUPER_ADMIN)
  seedDemoData(@SchoolId() schoolId: string, @CurrentUser() user: { sub: string }) {
    return this.demoSeed.seed(schoolId, user.sub);
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN)
  update(@SchoolId() schoolId: string, @Body() body: any) {
    return this.schools.update(schoolId, body);
  }
}
