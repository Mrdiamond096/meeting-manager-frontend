/** Routes reachable without a session cookie. */
export const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'] as const;

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const SESSION_COOKIE = 'sid';

export const newMeetingHref = '/meetings/new';
export const editMeetingHref = (id: string) => `/meetings/${id}/edit`;
/** C3 (Candidate Summary) will point this at the detail page; until then a card opens the edit form. */
export const meetingHref = editMeetingHref;

export function loginRedirect(pathname: string, search = ''): string {
  const next = `${pathname}${search}`;
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}
