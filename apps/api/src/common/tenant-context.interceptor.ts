import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context';

/**
 * Runs after the auth guard (so `req.user` is populated) and before the route
 * handler, inside the AsyncLocalStorage scope opened by TenantMiddleware. It
 * tops up the tenant store with the JWT-derived tenant/user so the RLS-aware
 * Prisma client has the right `schoolId` for every query the controller and its
 * services make.
 *
 * Subdomain-derived tenancy is already seeded by the middleware; this covers
 * routes whose tenant comes from the access token (`req.user.schoolId`).
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const schoolId: string | undefined = req?.user?.schoolId ?? req?.schoolId;
    const userId: string | undefined = req?.user?.id ?? req?.user?.sub;
    if (schoolId || userId) {
      TenantContext.set({
        ...(schoolId ? { schoolId } : {}),
        ...(userId ? { userId } : {}),
      });
    }
    return next.handle();
  }
}
