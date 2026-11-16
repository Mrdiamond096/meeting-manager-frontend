import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { toAuthError } from './errors';
import { registerSchema, safeNext } from './schemas';

describe('auth schemas', () => {
  it('only allows same-app redirect targets', () => {
    expect(safeNext('/candidates/1?x=1')).toBe('/candidates/1?x=1');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });

  it('rejects control characters the URL parser strips into an external host', () => {
    expect(safeNext('/\n/evil.example')).toBe('/');
    expect(safeNext('/\t/evil.example')).toBe('/');
    expect(safeNext(decodeURIComponent('%2F%0A%2Fevil.example'))).toBe('/');
    expect(safeNext('/\r\n/evil.example/path')).toBe('/');
    expect(safeNext('\\evil.example')).toBe('/');
  });

  it('returns the normalised same-origin path', () => {
    expect(safeNext('/a/../candidates?x=1#top')).toBe('/candidates?x=1#top');
    expect(safeNext('/candi\tdates')).toBe('/candidates');
  });

  it('enforces 8 chars, 72 bytes and matching confirmation', () => {
    const base = { email: 'a@b.co', password: 'password1', confirmPassword: 'password1' };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: 'short', confirmPassword: 'short' }).success).toBe(false);
    const thai = 'ก'.repeat(25); // 75 bytes in UTF-8
    expect(registerSchema.safeParse({ ...base, password: thai, confirmPassword: thai }).success).toBe(false);
    const r = registerSchema.safeParse({ ...base, confirmPassword: 'other1234' });
    expect(r.success || r.error.issues[0]?.path).toEqual(['confirmPassword']);
  });
});

describe('toAuthError', () => {
  const otp = (n: string) => new ApiError(400, 'OTP_INVALID', 'x', 'r', [{ path: 'attemptsRemaining', message: n }]);

  it('maps attempts remaining and lockout', () => {
    expect(toAuthError(otp('3'))).toMatchObject({ key: 'auth.error.otpInvalid', attemptsRemaining: 3 });
    expect(toAuthError(otp('0')).key).toBe('auth.error.otpLocked');
  });

  it('shows requestId only for unexpected errors', () => {
    expect(toAuthError(new ApiError(500, 'INTERNAL_ERROR', 'x', 'req-9'))).toMatchObject({ key: 'auth.error.generic', requestId: 'req-9' });
    expect(toAuthError(new ApiError(401, 'INVALID_CREDENTIALS', 'x', 'req-1')).requestId).toBeUndefined();
  });
});
