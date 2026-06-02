import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostType, Role } from '@prisma/client';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, SchoolId } from '../common/tenant.decorator';

@Controller('feed')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedController {
  constructor(private feed: FeedService) {}

  @Get()
  list(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Query('sectionId') sectionId?: string,
    @Query('type') type?: PostType,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feed.list(schoolId, user, {
      sectionId,
      type,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  create(@SchoolId() schoolId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.feed.create(schoolId, user.sub, body);
  }

  @Patch(':id/pin')
  @Roles(Role.SUPER_ADMIN, Role.TEACHER)
  pin(@SchoolId() schoolId: string, @Param('id') id: string, @Body() body: { pin: boolean }) {
    return this.feed.pin(schoolId, id, !!body.pin);
  }

  @Post(':id/comments')
  comment(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { body: string },
  ) {
    return this.feed.comment(schoolId, id, user.sub, body.body);
  }

  @Post(':id/react')
  react(
    @SchoolId() schoolId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { emoji?: string },
  ) {
    return this.feed.react(schoolId, id, user.sub, body.emoji);
  }

  @Delete(':id/react')
  unreact(@CurrentUser() user: any, @Param('id') id: string, @Query('emoji') emoji?: string) {
    return this.feed.unreact(id, user.sub, emoji);
  }
}
