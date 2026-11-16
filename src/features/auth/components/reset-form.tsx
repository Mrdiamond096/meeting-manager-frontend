'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/input';
import { useI18n } from '@/i18n/i18n-provider';
import type { MessageKey } from '@/i18n/dictionaries';
import { authApi } from '../api';
import { toAuthError } from '../errors';
import { resetSchema, type ResetValues } from '../schemas';
import { AuthCard } from './auth-card';
import { AuthError, DemoOtpHint } from './auth-error';
import { OtpInput } from './otp-input';
import { TextField } from './text-field';

export function ResetForm() {
  const { t } = useI18n();
  const router = useRouter();
  const challengeId = useSearchParams().get('c');
  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });
  const reset = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => router.replace('/login?reset=1'),
  });
  const err = (key?: string) => (key ? t(key as MessageKey) : undefined);
  const { errors } = form.formState;

  if (!challengeId) {
    return (
      <AuthCard title={t('auth.reset.title')}>
        <AuthError error={{ key: 'auth.error.otpInvalid' }} />
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-primary hover:underline">
          {t('auth.forgot.title')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.reset.title')} description={t('auth.reset.subtitle')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(({ code, newPassword }) => reset.mutate({ challengeId, code, newPassword }))}
      >
        <AuthError error={reset.isError ? toAuthError(reset.error) : null} />
        <div className="flex flex-col gap-1.5">
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <OtpInput label={t('auth.field.code')} value={field.value} onChange={field.onChange} invalid={Boolean(errors.code)} autoFocus />
            )}
          />
          <FieldError id="reset-code-error">{err(errors.code?.message)}</FieldError>
          <DemoOtpHint />
        </div>
        <TextField label={t('auth.field.newPassword')} type="password" autoComplete="new-password" placeholder={t('auth.field.passwordHint')} error={err(errors.newPassword?.message)} {...form.register('newPassword')} />
        <TextField label={t('auth.field.confirmPassword')} type="password" autoComplete="new-password" error={err(errors.confirmPassword?.message)} {...form.register('confirmPassword')} />
        <Button type="submit" disabled={reset.isPending}>
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
