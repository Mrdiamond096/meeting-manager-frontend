'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { currentUserKey } from '@/components/shell/use-current-user';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/i18n/i18n-provider';
import { authApi } from '../api';
import { challengeEmail, moveChallengeEmail } from '../challenge-email';
import { toAuthError } from '../errors';
import { otpField, safeNext } from '../schemas';
import { AuthCard } from './auth-card';
import { AuthError, DemoOtpHint } from './auth-error';
import { OtpInput } from './otp-input';

export function VerifyForm() {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const challengeId = params.get('c');
  const next = safeNext(params.get('next'));
  const [code, setCode] = useState('');
  const [formatError, setFormatError] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => setEmail(challengeEmail(challengeId)), [challengeId]);

  const verify = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(currentUserKey, user);
      router.replace(next);
      router.refresh();
    },
    onError: () => setCode(''),
  });
  const resend = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: ({ challengeId: newId }) => {
      if (challengeId) moveChallengeEmail(challengeId, newId);
      verify.reset();
      setCode('');
      router.replace(`/verify?${new URLSearchParams({ c: newId, next })}`);
      toast({ tone: 'success', title: t('auth.verify.resent') });
    },
  });

  if (!challengeId) {
    return (
      <AuthCard title={t('auth.verify.title')}>
        <AuthError error={{ key: 'auth.error.otpInvalid' }} />
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </AuthCard>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!otpField.safeParse(code).success) return setFormatError(true);
    setFormatError(false);
    verify.mutate({ challengeId: challengeId!, code });
  }

  const apiError = verify.isError ? toAuthError(verify.error) : resend.isError ? toAuthError(resend.error) : null;
  const locked = apiError?.key === 'auth.error.otpLocked';

  return (
    <AuthCard
      title={t('auth.verify.title')}
      description={email ? t('auth.verify.sentTo').replace('{email}', email) : t('auth.verify.sent')}
    >
      <form noValidate className="flex flex-col gap-4" onSubmit={onSubmit}>
        <AuthError error={formatError ? { key: 'auth.validation.otpFormat' } : apiError} />
        <OtpInput
          label={t('auth.field.code')}
          value={code}
          onChange={setCode}
          invalid={formatError || verify.isError}
          disabled={locked}
          autoFocus
        />
        <DemoOtpHint />
        <Button type="submit" disabled={verify.isPending || locked}>
          {t('auth.verify.submit')}
        </Button>
        <div className="flex justify-between text-sm">
          <Link href="/login" className="text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
          <button
            type="button"
            className="text-primary hover:underline disabled:opacity-50"
            disabled={resend.isPending}
            onClick={() => resend.mutate({ challengeId })}
          >
            {t('auth.verify.resend')}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
