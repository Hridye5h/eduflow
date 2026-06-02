import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext, TenantStore } from './tenant-context';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      schoolId?: string;
      schoolSubdomain?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Establish a per-request tenant store for the whole async call tree. It is
    // seeded from the subdomain here and topped up from the JWT later by
    // TenantContextInterceptor. The RLS-aware Prisma client reads it at query time.
    const store: TenantStore = {};

    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const headerOverride = req.headers['x-school-subdomain'] as string | undefined;
    const subdomain = headerOverride ?? this.parseSubdomain(host);

    if (subdomain) {
      // School is the tenant-root table and is NOT under RLS, so the base client
      // can resolve it before any tenant context exists.
      const school = await this.prisma.school.findUnique({
        where: { subdomain },
        select: { id: true, subdomain: true, isActive: true },
      });
      if (!school || !school.isActive) {
        throw new NotFoundException(`Unknown or inactive school: ${subdomain}`);
      }
      req.schoolId = school.id;
      req.schoolSubdomain = school.subdomain;
      store.schoolId = school.id;
    }

    TenantContext.run(store, () => next());
  }

  /**
   * Extract the tenant subdomain from the Host header — but ONLY when the
   * host actually sits under our wildcard ROOT_DOMAIN. This avoids treating
   * `127.0.0.1` → '127' or `eduflow-api.onrender.com` → 'eduflow-api' as a
   * tenant subdomain. When ROOT_DOMAIN isn't set (pilot / CI / local dev),
   * Host parsing is disabled and only the explicit x-school-subdomain
   * header (sent by the web client from localStorage) carries the tenant.
   */
  private parseSubdomain(host: string): string | null {
    const cleaned = host.replace(/:\d+$/, '').toLowerCase();
    if (!cleaned || /^[\d.]+$/.test(cleaned)) return null; // IPv4
    const root = (process.env.ROOT_DOMAIN || '').toLowerCase();
    if (!root) return null;
    if (cleaned === root) return null;
    if (!cleaned.endsWith('.' + root)) return null;
    const sub = cleaned.slice(0, -1 - root.length);
    if (!sub || sub === 'www' || sub === 'api') return null;
    return sub;
  }
}
