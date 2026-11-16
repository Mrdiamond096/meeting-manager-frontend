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

/** Minutes since local midnight of `day`, clamped to the day (events crossing midnight are cut at the edge). */
export function minutesInDay(instant: Date, day: Date): number {
  const minutes = (instant.getTime() - day.getTime()) / 60_000;
  const length = (addDays(day, 1).getTime() - day.getTime()) / 60_000; // 1380/1500 on DST days
  return Math.min(Math.max(minutes, 0), length);
}
