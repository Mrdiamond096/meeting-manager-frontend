// Runs in its own process (vitest.config.ts poolMatchGlobs): TZ is process-wide and must not leak into other files.
process.env.TZ = 'America/New_York';

import { describe, expect, it } from 'vitest';
import type { Meeting } from '@/features/meetings/types';
import { minutesInDay } from './dates';
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
