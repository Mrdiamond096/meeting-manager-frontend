'use client';

import { Alert } from '@/components/ui/alert';
import { useI18n } from '@/i18n/i18n-provider';
import type { AuthErrorView } from '../errors';

export function AuthError({ error }: { error: AuthErrorView | null }) {
  const { t } = useI18n();
  if (!error) return null;
  const text =
    error.key === 'auth.error.otpInvalid' && error.attemptsRemaining !== undefined
      ? t('auth.error.otpAttempts').replace('{n}', String(error.attemptsRemaining))
      : t(error.key);
  return (
    <Alert tone="error">
      {text}
      {error.requestId ? (
        <span className="mt-1 block text-xs opacity-80">
          {t('error.requestId')}: <code className="font-mono">{error.requestId}</code>
        </span>
      ) : null}
    </Alert>
  );
}

export function DemoOtpHint() {
  const { t } = useI18n();
  return <p className="text-xs text-muted-foreground">{t('auth.demoOtp')}</p>;
}
