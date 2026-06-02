import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('/')
  root() {
    return {
      name: 'eduflow-api',
      status: 'ok',
      docs: process.env.ENABLE_SWAGGER === 'true' ? '/docs' : null,
    };
  }

  @Get('/health')
  async health() {
    let db: 'ok' | 'down' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    const ok = db === 'ok';
    return {
      status: ok ? 'ok' : 'degraded',
      db,
      uptime: process.uptime(),
      now: new Date().toISOString(),
    };
  }
}
