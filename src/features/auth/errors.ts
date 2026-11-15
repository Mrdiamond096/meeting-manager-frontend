import type { MessageKey } from '@/i18n/dictionaries';
import { isApiError } from '@/lib/api';

const BY_CODE: Partial<Record<string, MessageKey>> = {
  INVALID_CREDENTIALS: 'auth.error.invalidCredentials',
  EMAIL_TAKEN: 'auth.error.emailTaken',
  OTP_INVALID: 'auth.error.otpInvalid',
  RATE_LIMITED: 'auth.error.rateLimited',
  NETWORK_ERROR: 'auth.error.network',
  VALIDATION_ERROR: 'auth.error.validation',
};

export interface AuthErrorView {
  key: MessageKey;
  attemptsRemaining?: number;
  requestId?: string;
}

export function toAuthError(err: unknown): AuthErrorView {
  if (!isApiError(err)) return { key: 'auth.error.generic' };
  const remaining = err.details?.find((d) => d.path === 'attemptsRemaining')?.message;
  const attemptsRemaining = remaining !== undefined && /^\d+$/.test(remaining) ? Number(remaining) : undefined;
  const key = BY_CODE[err.code] ?? 'auth.error.generic';
  return {
    key: key === 'auth.error.otpInvalid' && attemptsRemaining === 0 ? 'auth.error.otpLocked' : key,
    attemptsRemaining,
    requestId: key === 'auth.error.generic' ? err.requestId : undefined,
  };
}
