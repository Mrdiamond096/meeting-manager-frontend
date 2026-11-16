import type { Locale } from '@/i18n/dictionaries';
import type { Meeting } from './types';

export const startOfLocalDay = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

export function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/** A meeting is "past" once its end (or start when there is no end) has gone by; cancelled ones keep their status. */
export const isPastMeeting = (m: Pick<Meeting, 'status' | 'dueDate' | 'endAt'>, now: Date) =>
  m.status !== 'CANCELLED' && new Date(m.endAt ?? m.dueDate).getTime() < now.getTime();

/** "Oct 12, 2025 · 10:00 – 11:00 AM" (TH: Buddhist year, 24h). */
export function formatMeetingWhen(m: Pick<Meeting, 'dueDate' | 'endAt'>, intl: string, locale: Locale): string {
  const hour12 = locale === 'en';
  const date = new Intl.DateTimeFormat(intl, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(m.dueDate));
  const time = new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit', hour12 });
  const start = time.format(new Date(m.dueDate));
  return m.endAt ? `${date} · ${start} – ${time.format(new Date(m.endAt))}` : `${date} · ${start}`;
}
