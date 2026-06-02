import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DunningService } from './dunning.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchoolId } from '../common/tenant.decorator';

@Controller('dunning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DunningController {
  constructor(private dunning: DunningService) {}

  @Post('start')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  start(
    @SchoolId() schoolId: string,
    @Body()
    body: { studentId: string; feePaymentId?: string; amount: number; dueDate: string; toPhone: string },
  ) {
    return this.dunning.startRun({
      schoolId,
      studentId: body.studentId,
      feePaymentId: body.feePaymentId,
      amount: body.amount,
      dueDate: new Date(body.dueDate),
      toPhone: body.toPhone,
    });
  }

  /** HITL: owner approves an escalated (stage 4+) send. */
  @Post(':id/approve')
  @Roles(Role.SUPER_ADMIN)
  async approve(@Param('id') id: string) {
    await this.dunning.approveEscalatedSend(id);
    return { ok: true };
  }

  @Post(':id/paid')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  async paid(@Param('id') id: string) {
    await this.dunning.markPaid(id);
    return { ok: true };
  }

  @Post(':id/stop')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  async stop(@Param('id') id: string, @Body() body: { detail?: string }) {
    await this.dunning.stopRun(id, body?.detail);
    return { ok: true };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.dunning.getRun(id);
  }
}
