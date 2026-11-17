import { expect, it } from 'vitest';
import { calendarReturnHref, meetingCancelHref } from './routes';

it('keeps calendar state and filters while dropping unrelated parameters', () => {
  const params = new URLSearchParams('view=calendar&mode=month&date=2026-11-18&status=PENDING&mine=false&page=9');
  expect(calendarReturnHref(params)).toBe('/?view=calendar&mode=month&date=2026-11-18&status=PENDING&mine=false');
  expect(calendarReturnHref(new URLSearchParams('view=list'))).toBeUndefined();
});

it.each([
  undefined,
  ['/?view=calendar'],
  'https://example.com/?view=calendar',
  '//example.com/?view=calendar',
  '/login',
  '/?view=list',
])('falls back to the dashboard for an unsupported return target %s', (target) => {
  expect(meetingCancelHref(target)).toBe('/');
});
