/** Routes reachable without a session cookie. */
export const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'] as const;

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const SESSION_COOKIE = 'sid';

export const newMeetingHref = '/meetings/new';
/** The new-meeting form with its date (YYYY-MM-DD) and start (HH:mm) filled in, from a calendar slot. */
export const newMeetingAt = (date: string, time: string) => `${newMeetingHref}?date=${date}&start=${time}`;
export const editMeetingHref = (id: string) => `/meetings/${id}/edit`;
export const candidateHref = (id: string, meetingId?: string) =>
  meetingId ? `/candidates/${id}?meeting=${meetingId}` : `/candidates/${id}`;
/** A meeting opens its candidate's summary; one without a candidate has no summary, so it opens the edit form. */
export const meetingHref = (m: { id: string; candidate: { id: string } | null }) =>
  m.candidate ? candidateHref(m.candidate.id, m.id) : editMeetingHref(m.id);

export function loginRedirect(pathname: string, search = ''): string {
  const next = `${pathname}${search}`;
  return next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`;
}
