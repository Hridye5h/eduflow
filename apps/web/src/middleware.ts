import { NextRequest, NextResponse } from 'next/server';

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'eduflow.local';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const cleaned = host.split(':')[0];

  const sub =
    cleaned.endsWith(`.${ROOT}`) && cleaned !== ROOT
      ? cleaned.slice(0, -1 - ROOT.length)
      : null;

  const res = NextResponse.next();
  if (sub && sub !== 'www') res.headers.set('x-school-subdomain', sub);
  return res;
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
