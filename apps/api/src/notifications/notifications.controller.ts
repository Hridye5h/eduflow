import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationChannel, NotificationType, Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private n: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('unread') unread?: string) {
    return this.n.list(user.sub, { onlyUnread: unread === 'true' });
  }

  @Get('unread-count')
  count(@CurrentUser() user: any) {
    return this.n.unreadCount(user.sub).then((c) => ({ count: c }));
  }

  @Patch(':id/read')
  read(@CurrentUser() user: any, @Param('id') id: string) {
    return this.n.markRead(user.sub, id);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: any) {
    return this.n.markAllRead(user.sub);
  }

  @Post('broadcast')
  @Roles(Role.SUPER_ADMIN)
  broadcast(
    @SchoolId() schoolId: string,
    @Body() body: { audience: 'ALL' | Role; title: string; body: string },
  ) {
    return this.n.broadcast(schoolId, body);
  }

  @Get('preferences')
  prefs(@CurrentUser() user: any) {
    return this.n.getPrefs(user.sub);
  }

  @Patch('preferences')
  setPref(
    @CurrentUser() user: any,
    @Body() body: { type: NotificationType; channel: NotificationChannel; enabled: boolean },
  ) {
    return this.n.setPref(user.sub, body.type, body.channel, body.enabled);
  }
}
