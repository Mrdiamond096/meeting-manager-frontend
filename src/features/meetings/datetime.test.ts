import { describe, expect, it } from 'vitest';
import { formatMeetingWhen, isPastMeeting } from './datetime';
import type { Meeting } from './types';

const meeting: Pick<Meeting, 'status' | 'dueDate' | 'endAt'> = {
  status: 'PENDING',
  dueDate: new Date(2030, 4, 10, 10).toISOString(),
  endAt: new Date(2030, 4, 10, 11).toISOString(),
};

describe('datetime', () => {
  it('marks a meeting past only after its end, never cancelled ones', () => {
    const now = new Date(meeting.endAt!);
    expect(isPastMeeting(meeting, new Date(now.getTime() - 1))).toBe(false);
    expect(isPastMeeting(meeting, new Date(now.getTime() + 1))).toBe(true);
    expect(isPastMeeting({ ...meeting, status: 'CANCELLED' }, new Date(now.getTime() + 1))).toBe(false);
  });

  it('formats the range in English (12h) and Thai (24h)', () => {
    expect(formatMeetingWhen(meeting, 'en-US', 'en')).toBe('May 10, 2030 · 10:00 AM – 11:00 AM');
    expect(formatMeetingWhen(meeting, 'th-TH-u-ca-buddhist', 'th')).toContain('2573');
    expect(formatMeetingWhen({ ...meeting, endAt: null }, 'en-US', 'en')).toBe('May 10, 2030 · 10:00 AM');
  });
});
