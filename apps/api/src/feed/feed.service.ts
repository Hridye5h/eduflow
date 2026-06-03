import { BadRequestException, Injectable } from '@nestjs/common';
import { PostScope, PostType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreatePost = {
  type: PostType;
  scope: PostScope;
  sectionId?: string | null;
  title: string;
  body: string;
  attachments?: Array<{ url: string; name: string; mime?: string; size?: number }>;
  scheduledFor?: string | null;
  pin?: boolean;
};

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async create(schoolId: string, authorId: string, dto: CreatePost) {
    if (dto.scope === PostScope.CLASS && !dto.sectionId) {
      throw new BadRequestException('sectionId required for CLASS scope');
    }
    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    const publishedAt = scheduledFor && scheduledFor > new Date() ? null : new Date();

    return this.prisma.db.post.create({
      data: {
        schoolId,
        authorId,
        type: dto.type,
        scope: dto.scope,
        sectionId: dto.scope === PostScope.CLASS ? dto.sectionId : null,
        title: dto.title,
        body: dto.body,
        attachmentsJson: dto.attachments ?? [],
        scheduledFor,
        publishedAt,
        isPinned: !!dto.pin,
      },
    });
  }

  async list(
    schoolId: string,
    user: { sub: string; role: Role },
    opts: { sectionId?: string; type?: PostType; cursor?: string; limit?: number },
  ) {
    const limit = Math.min(opts.limit ?? 25, 100);

    // Restrict CLASS posts to the viewer's own section(s) + school-wide posts.
    // Students → their section; parents → each linked child's section.
    let allowedSections: string[] = opts.sectionId ? [opts.sectionId] : [];
    if (user.role === Role.STUDENT) {
      const me = await this.prisma.db.user.findUnique({
        where: { id: user.sub },
        select: { sectionId: true },
      });
      allowedSections = me?.sectionId ? [me.sectionId] : [];
    } else if (user.role === Role.PARENT) {
      const links = await this.prisma.db.parentLink.findMany({
        where: { parentId: user.sub },
        select: { student: { select: { sectionId: true } } },
      });
      allowedSections = [
        ...new Set(links.map((l) => l.student?.sectionId).filter((s): s is string => !!s)),
      ];
    }

    const where: any = {
      schoolId,
      publishedAt: { lte: new Date() },
      OR: [
        { scope: PostScope.SCHOOL },
        ...(allowedSections.length
          ? [{ scope: PostScope.CLASS, sectionId: { in: allowedSections } }]
          : []),
      ],
      ...(opts.type && { type: opts.type }),
    };

    return this.prisma.db.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        _count: { select: { comments: true, reactions: true } },
        assignment: true,
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      ...(opts.cursor && { skip: 1, cursor: { id: opts.cursor } }),
    });
  }

  async pin(schoolId: string, postId: string, pin: boolean) {
    const post = await this.prisma.db.post.findFirst({ where: { id: postId, schoolId } });
    if (!post) throw new BadRequestException('Post not found');
    return this.prisma.db.post.update({ where: { id: postId }, data: { isPinned: pin } });
  }

  async comment(schoolId: string, postId: string, authorId: string, body: string) {
    return this.prisma.db.postComment.create({
      data: { schoolId, postId, authorId, body },
    });
  }

  async react(schoolId: string, postId: string, userId: string, emoji = '👍') {
    return this.prisma.db.postReaction.upsert({
      where: { postId_userId_emoji: { postId, userId, emoji } },
      update: {},
      create: { schoolId, postId, userId, emoji },
    });
  }

  async unreact(postId: string, userId: string, emoji = '👍') {
    await this.prisma.db.postReaction.deleteMany({ where: { postId, userId, emoji } });
    return { ok: true };
  }
}
