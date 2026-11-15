/** Routes reachable without a session cookie. */
export const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'] as const;

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const SESSION_COOKIE = 'sid';

export function loginRedirect(pathname: string, search = ''): string {
  const next = `${pathname}${search}`;
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}
