import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce } from '@/lib/csp';
import { isPublicPath, loginRedirect, SESSION_COOKIE } from '@/lib/routes';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // UX only: the API enforces auth (ADR-009). Missing cookie → go to login first.
  if (!isPublicPath(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(loginRedirect(pathname, search), request.url));
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api/|_next/static|_next/image|favicon.ico|brand/).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
