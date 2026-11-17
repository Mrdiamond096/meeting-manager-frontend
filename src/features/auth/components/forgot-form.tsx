'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ActionLink as Link } from '@/components/ui/action-link';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-provider';
import type { MessageKey } from '@/i18n/dictionaries';
import { authApi } from '../api';
import { rememberChallengeEmail } from '../challenge-email';
import { toAuthError } from '../errors';
import { forgotSchema, type ForgotValues } from '../schemas';
import { AuthCard } from './auth-card';
import { AuthError } from './auth-error';
import { TextField } from './text-field';

export function ForgotForm() {
  const { t } = useI18n();
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });
  const forgot = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: ({ challengeId }, { email }) => rememberChallengeEmail(challengeId, email.trim().toLowerCase()),
  });
  const sent = forgot.data;
  const emailError = form.formState.errors.email?.message;

  return (
    <AuthCard title={t('auth.forgot.title')} description={t('auth.forgot.subtitle')}>
      <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => forgot.mutate(v))}>
        <AuthError error={forgot.isError ? toAuthError(forgot.error) : null} />
        <TextField
          label={t('auth.field.email')}
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          readOnly={Boolean(sent)}
          error={emailError ? t(emailError as MessageKey) : undefined}
          {...form.register('email')}
        />
        {sent ? (
          <>
            {/* Same message whether or not the account exists (ADR-009). */}
            <Alert tone="info">{t('auth.forgot.sent')}</Alert>
            <Link href={`/reset-password?${new URLSearchParams({ c: sent.challengeId })}`} className={buttonVariants()}>
              {t('auth.forgot.continue')}
            </Link>
          </>
        ) : (
          <Button type="submit" loading={forgot.isPending}>
            {t('auth.forgot.submit')}
          </Button>
        )}
        <Link href="/login" className="text-sm text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </form>
    </AuthCard>
  );
}
