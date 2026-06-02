import { ExecutionContext, ForbiddenException, createParamDecorator } from '@nestjs/common';

export const SchoolId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  const schoolId: string | undefined = req.user?.schoolId ?? req.schoolId;
  if (!schoolId) throw new ForbiddenException('No school context');
  return schoolId;
});

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user;
});
