/** Local-calendar date helpers for the calendar (browser timezone, ADR-005). Days are local midnights. */

const pad = (n: number) => String(n).padStart(2, '0');

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Calendar arithmetic (keeps local midnight across DST changes, unlike adding 24h). */
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Weeks start on Monday (ADR-014: columns Mon–Sun). */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  return addDays(day, -((day.getDay() + 6) % 7));
}

export const weekDays = (d: Date) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d), i));

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** `YYYY-MM-DD` for the `date` URL parameter. */
export const toDateParam = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses `YYYY-MM-DD`; anything else (or an impossible date) falls back. */
export function parseDateParam(value: string | null, fallback: Date): Date {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return startOfDay(fallback);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : startOfDay(fallback);
}

/**
 * Wall-clock minutes of `instant` on the grid of local `day` (0–1440), as the hour labels read: 10:00 is 600 even on a
 * DST day, when 10:00 is 9 or 11 elapsed hours after midnight. Instants before or after the day clamp to its edges.
 */
export function minutesInDay(instant: Date, day: Date): number {
  if (instant < day) return 0;
  if (instant >= addDays(day, 1)) return 24 * 60;
  return instant.getHours() * 60 + instant.getMinutes() + instant.getSeconds() / 60;
}
