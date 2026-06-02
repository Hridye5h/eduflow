import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get('groups')
  myGroups(@SchoolId() schoolId: string, @CurrentUser() user: any) {
    return this.chat.myGroups(schoolId, user);
  }

  @Post('groups/section/:id')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  ensureSectionGroup(@SchoolId() schoolId: string, @Param('id') id: string) {
    return this.chat.getOrCreateSectionGroup(schoolId, id);
  }

  @Get('groups/:id/messages')
  list(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.chat.messages(schoolId, id, before);
  }

  @Post('groups/:id/messages')
  send(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.chat.send(schoolId, id, user.sub, body.body);
  }

  @Patch('groups/:id/student-to-student')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  toggle(
    @SchoolId() schoolId: string,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.chat.toggleStudentToStudent(schoolId, id, !!body.enabled);
  }

  @Post('direct/:userId')
  direct(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('userId') userId: string,
  ) {
    return this.chat.directWith(schoolId, user.sub, userId);
  }
}
