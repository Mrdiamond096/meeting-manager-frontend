// Runs in its own process (vitest.config.ts poolMatchGlobs): TZ is process-wide and must not leak into other files.
process.env.TZ = 'America/New_York';

import { describe, expect, it } from 'vitest';
import type { Meeting } from '@/features/meetings/types';
import { minutesInDay, monthGrid, splitDays } from './dates';
import { layoutDay } from './layout';

const meeting = (start: Date, end: Date): Meeting => ({ id: 'm', dueDate: start.toISOString(), endAt: end.toISOString(), status: 'PENDING' }) as Meeting;

describe('positions on DST days (America/New_York)', () => {
  it('runs in the expected zone', () => {
    expect(new Date(2026, 2, 8, 12).getTimezoneOffset()).toBe(240); // EDT after the spring change
    expect(new Date(2026, 2, 7, 12).getTimezoneOffset()).toBe(300); // EST before it
  });

  it('puts 10:00 at the 10:00 line on the spring-forward day (23-hour day)', () => {
    const day = new Date(2026, 2, 8);
    expect(minutesInDay(new Date(2026, 2, 8, 10), day)).toBe(600);
    expect(layoutDay([meeting(new Date(2026, 2, 8, 10), new Date(2026, 2, 8, 11))], day)[0]).toMatchObject({ top: 600, height: 60 });
  });

  it('puts 10:00 at the 10:00 line on the fall-back day (25-hour day)', () => {
    const day = new Date(2026, 10, 1);
    expect(layoutDay([meeting(new Date(2026, 10, 1, 10), new Date(2026, 10, 1, 11))], day)[0]).toMatchObject({ top: 600, height: 60 });
  });

  it('still ends the day at the bottom of the grid', () => {
    const day = new Date(2026, 2, 8);
    expect(minutesInDay(new Date(2026, 2, 9, 0, 30), day)).toBe(1440);
  });
});

describe('month range across the fall-back change (America/New_York)', () => {
  const API_MAX_MS = 42 * 24 * 3_600_000;

  it('is longer than the API allows as one request, but every chunk fits', () => {
    const grid = monthGrid(new Date(2026, 10, 18)); // 26 Oct – 6 Dec 2026, includes 1 Nov (25 hours)
    const from = grid[0]!;
    const to = new Date(2026, 11, 7);
    expect(to.getTime() - from.getTime()).toBe(API_MAX_MS + 3_600_000); // 1,009 hours
    const chunks = splitDays(from, to);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]![0]).toEqual(from);
    expect(chunks[1]![1]).toEqual(to);
    expect(chunks[0]![1]).toEqual(chunks[1]![0]);
    for (const [f, t] of chunks) expect(t.getTime() - f.getTime()).toBeLessThanOrEqual(API_MAX_MS);
  });
});
