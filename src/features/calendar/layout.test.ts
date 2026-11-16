import { describe, expect, it } from 'vitest';
import type { Meeting } from '@/features/meetings/types';
import { addDays, parseDateParam, startOfWeek, toDateParam, weekDays } from './dates';
import { layoutDay } from './layout';

const day = new Date(2026, 10, 16); // Mon 16 Nov 2026, local
const at = (h: number, m = 0, d = day) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).toISOString();
const meeting = (id: string, start: string, end: string | null): Meeting =>
  ({ id, dueDate: start, endAt: end, status: 'PENDING' }) as Meeting;

describe('dates', () => {
  it('starts weeks on Monday, also from a Sunday', () => {
    expect(toDateParam(startOfWeek(new Date(2026, 10, 22, 23)))).toBe('2026-11-16');
    expect(weekDays(day).map(toDateParam)).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });

  it('parses the date parameter and falls back on garbage or impossible dates', () => {
    expect(toDateParam(parseDateParam('2026-02-28', day))).toBe('2026-02-28');
    expect(toDateParam(parseDateParam('2026-02-31', day))).toBe('2026-11-16');
    expect(toDateParam(parseDateParam('next week', day))).toBe('2026-11-16');
    expect(toDateParam(parseDateParam(null, day))).toBe('2026-11-16');
  });

  it('adds calendar days across a month end', () => {
    expect(toDateParam(addDays(new Date(2026, 10, 30), 1))).toBe('2026-12-01');
  });
});

describe('layoutDay', () => {
  it('positions an event by its local start and end in minutes', () => {
    const [e] = layoutDay([meeting('a', at(10), at(11, 30))], day);
    expect(e).toMatchObject({ top: 600, height: 90, column: 0, columns: 1 });
  });

  it('gives a meeting without an end 30 minutes', () => {
    expect(layoutDay([meeting('a', at(9), null)], day)[0]!.height).toBe(30);
  });

  it('splits overlapping events into columns and leaves separate ones full width', () => {
    const placed = layoutDay(
      [meeting('a', at(9), at(10)), meeting('b', at(9, 30), at(10, 30)), meeting('c', at(13), at(14))],
      day,
    );
    const by = Object.fromEntries(placed.map((p) => [p.meeting.id, p]));
    expect(by.a).toMatchObject({ column: 0, columns: 2 });
    expect(by.b).toMatchObject({ column: 1, columns: 2 });
    expect(by.c).toMatchObject({ column: 0, columns: 1 });
  });

  it('reuses a free column inside a chain of overlaps', () => {
    const placed = layoutDay(
      [meeting('a', at(9), at(11)), meeting('b', at(9), at(10)), meeting('c', at(10), at(11))],
      day,
    );
    const by = Object.fromEntries(placed.map((p) => [p.meeting.id, p]));
    expect(by.c!.column).toBe(by.b!.column);
    expect(placed.every((p) => p.columns === 2)).toBe(true);
  });

  it('cuts an overnight meeting at the day edges and shows it on both days', () => {
    const overnight = meeting('n', at(23), at(1, 0, addDays(day, 1)));
    expect(layoutDay([overnight], day)[0]).toMatchObject({ top: 1380, height: 60 });
    expect(layoutDay([overnight], addDays(day, 1))[0]).toMatchObject({ top: 0, height: 60 });
    expect(layoutDay([overnight], addDays(day, 2))).toEqual([]);
  });
});
