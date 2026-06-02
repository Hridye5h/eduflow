import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeeStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  listStructures(schoolId: string, classId?: string) {
    return this.prisma.feeStructure.findMany({
      where: { schoolId, ...(classId && { classId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStructure(
    schoolId: string,
    data: { classId: string; name: string; amount: number; dueDate?: string; isMandatory?: boolean },
  ) {
    const cls = await this.prisma.class.findFirst({ where: { id: data.classId, schoolId } });
    if (!cls) throw new BadRequestException('Class not in this school');

    const fee = await this.prisma.feeStructure.create({
      data: {
        schoolId,
        classId: data.classId,
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        isMandatory: data.isMandatory ?? true,
      },
    });

    // auto-create pending FeePayment rows for every student in the class
    const students = await this.prisma.user.findMany({
      where: { schoolId, role: Role.STUDENT, isActive: true, section: { classId: data.classId } },
      select: { id: true },
    });
    if (students.length) {
      await this.prisma.feePayment.createMany({
        data: students.map((s) => ({
          schoolId,
          structureId: fee.id,
          studentId: s.id,
          amountPaid: 0,
          status: FeeStatus.PENDING,
        })),
      });
    }
    return fee;
  }

  async listForClass(schoolId: string, classId: string) {
    const structures = await this.prisma.feeStructure.findMany({
      where: { schoolId, classId },
      include: {
        payments: {
          include: { student: { select: { id: true, name: true, rollNumber: true } } },
        },
      },
    });

    return structures.map((s) => {
      const total = s.payments.length;
      const paid = s.payments.filter((p) => p.status === FeeStatus.PAID).length;
      const partial = s.payments.filter((p) => p.status === FeeStatus.PARTIAL).length;
      const overdue = s.payments.filter((p) =>
        p.status !== FeeStatus.PAID && s.dueDate && s.dueDate < new Date()
      ).length;
      return {
        ...s,
        stats: { total, paid, partial, overdue },
        collected: s.payments.reduce((a, p) => a + p.amountPaid, 0),
      };
    });
  }

  async forStudent(schoolId: string, studentId: string) {
    return this.prisma.feePayment.findMany({
      where: { schoolId, studentId },
      include: { structure: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recordPayment(
    schoolId: string,
    paymentId: string,
    dto: { amount: number; txnRef?: string; receiptUrl?: string },
  ) {
    const pay = await this.prisma.feePayment.findFirst({
      where: { id: paymentId, schoolId },
      include: { structure: true },
    });
    if (!pay) throw new NotFoundException('Payment record not found');

    const newPaid = pay.amountPaid + dto.amount;
    const status =
      newPaid >= pay.structure.amount
        ? FeeStatus.PAID
        : newPaid > 0
          ? FeeStatus.PARTIAL
          : FeeStatus.PENDING;

    return this.prisma.feePayment.update({
      where: { id: paymentId },
      data: {
        amountPaid: newPaid,
        status,
        paidAt: status === FeeStatus.PAID ? new Date() : pay.paidAt,
        txnRef: dto.txnRef ?? pay.txnRef,
        receiptUrl: dto.receiptUrl ?? pay.receiptUrl,
      },
    });
  }

  async overdueRemind(schoolId: string) {
    const overdue = await this.prisma.feePayment.findMany({
      where: {
        schoolId,
        status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
        structure: { dueDate: { lt: new Date() } },
      },
      include: { structure: true, student: { select: { id: true, name: true } } },
    });

    if (!overdue.length) return { reminded: 0 };

    const studentIds = [...new Set(overdue.map((o) => o.studentId))];
    const links = await this.prisma.parentLink.findMany({
      where: { studentId: { in: studentIds } },
      select: { parentId: true, studentId: true },
    });

    await this.prisma.notification.createMany({
      data: links.map((l) => ({
        schoolId,
        userId: l.parentId,
        type: 'FEE_REMINDER' as const,
        title: 'Fee reminder',
        body: 'You have an overdue fee payment.',
        dataJson: { studentId: l.studentId },
      })),
      skipDuplicates: true,
    });

    return { reminded: links.length };
  }

  async summary(schoolId: string) {
    const all = await this.prisma.feePayment.findMany({
      where: { schoolId },
      select: { status: true, amountPaid: true, structure: { select: { amount: true, dueDate: true } } },
    });
    const summary = {
      total: all.length,
      paid: 0, partial: 0, pending: 0, overdue: 0,
      collected: 0, expected: 0,
    };
    const now = new Date();
    for (const p of all) {
      summary.collected += p.amountPaid;
      summary.expected += p.structure.amount;
      if (p.status === FeeStatus.PAID) summary.paid++;
      else if (p.status === FeeStatus.PARTIAL) summary.partial++;
      else summary.pending++;
      if (p.status !== FeeStatus.PAID && p.structure.dueDate && p.structure.dueDate < now) summary.overdue++;
    }
    return summary;
  }
}
