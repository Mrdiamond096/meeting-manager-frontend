/** Routes reachable without a session cookie. */
export const PUBLIC_PATHS = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'] as const;

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const SESSION_COOKIE = 'sid';

export const newMeetingHref = '/meetings/new';
/** The new-meeting form with its date (YYYY-MM-DD) and start (HH:mm) filled in, from a calendar slot. */
export const newMeetingAt = (date: string, time: string, returnTo?: string) =>
  `${newMeetingHref}?date=${date}&start=${time}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;

/** Preserve the calendar location and filters when opening a creation form. */
export function calendarReturnHref(params: Pick<URLSearchParams, 'get'>): string | undefined {
  if (params.get('view') !== 'calendar') return undefined;
  const query = new URLSearchParams({ view: 'calendar' });
  for (const key of ['mode', 'date', 'status', 'mine']) {
    const value = params.get(key);
    if (value !== null) query.set(key, value);
  }
  return `/?${query}`;
}

/** Only a local calendar dashboard is accepted as a creation form's return target. */
export function meetingCancelHref(returnTo: unknown): string {
  if (typeof returnTo !== 'string' || !returnTo.startsWith('/?')) return '/';
  return calendarReturnHref(new URLSearchParams(returnTo.slice(2))) ?? '/';
}
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
