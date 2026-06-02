import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  // ---- Users ----
  @Get('users')
  list(
    @SchoolId() schoolId: string,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    return this.admin.listUsers(schoolId, role, search);
  }

  @Post('users')
  create(@SchoolId() schoolId: string, @Body() body: any) {
    return this.admin.createUser(schoolId, body);
  }

  @Post('users/import')
  bulk(@SchoolId() schoolId: string, @Body() body: { role: Role; rows: any[] }) {
    return this.admin.bulkImportUsers(schoolId, body.role, body.rows ?? []);
  }

  @Patch('users/:id')
  update(@SchoolId() schoolId: string, @Param('id') id: string, @Body() body: any) {
    return this.admin.updateUser(schoolId, id, body);
  }

  @Patch('users/:id/active')
  toggle(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.admin.setActive(schoolId, id, !!body.isActive);
  }

  @Post('parent-link')
  linkParent(
    @SchoolId() schoolId: string,
    @Body() body: { parentId: string; studentId: string; relation?: string },
  ) {
    return this.admin.linkParent(schoolId, body.parentId, body.studentId, body.relation);
  }

  // ---- Subjects ----
  @Get('subjects')
  subjects(@SchoolId() schoolId: string) {
    return this.admin.listSubjects(schoolId);
  }

  @Post('subjects')
  createSubject(
    @SchoolId() schoolId: string,
    @Body() body: { name: string; code?: string },
  ) {
    return this.admin.createSubject(schoolId, body.name, body.code);
  }

  // ---- Audit ----
  @Get('audit')
  audit(@SchoolId() schoolId: string, @Query('limit') limit?: string) {
    return this.admin.listAudit(schoolId, limit ? Number(limit) : 100);
  }
}
