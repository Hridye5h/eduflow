import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    try {
      const payload = await this.jwt.verifyAsync(token);
      req.user = payload; // { sub, role, schoolId }

      // tenant safety: if subdomain was resolved, it must match the token's school
      if (req.schoolId && req.schoolId !== payload.schoolId) {
        throw new UnauthorizedException('Token does not match school subdomain');
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
