import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, opts: { onlyUnread?: boolean; limit?: number }) {
    const limit = Math.min(opts.limit ?? 50, 200);
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.onlyUnread && { readAt: null }) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Admin broadcast — email/SMS/in-app to a whole role inside the school. */
  async broadcast(
    schoolId: string,
    dto: { audience: 'ALL' | Role; title: string; body: string },
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(dto.audience !== 'ALL' && { role: dto.audience }),
      },
      select: { id: true },
    });
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        schoolId,
        userId: u.id,
        type: 'ANNOUNCEMENT' as const,
        title: dto.title,
        body: dto.body,
      })),
    });
    return { sent: users.length };
  }

  // ---- preferences ----
  getPrefs(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  async setPref(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type_channel: { userId, type, channel } },
      update: { enabled },
      create: { userId, type, channel, enabled },
    });
  }
}
