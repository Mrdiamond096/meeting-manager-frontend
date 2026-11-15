'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-provider';
import type { MessageKey } from '@/i18n/dictionaries';
import { authApi } from '../api';
import { rememberChallengeEmail } from '../challenge-email';
import { toAuthError } from '../errors';
import { registerSchema, type RegisterValues } from '../schemas';
import { AuthCard } from './auth-card';
import { AuthError } from './auth-error';
import { TextField } from './text-field';

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ challengeId }, { email }) => {
      rememberChallengeEmail(challengeId, email.trim().toLowerCase());
      router.push(`/verify?${new URLSearchParams({ c: challengeId, next: '/' })}`);
    },
  });
  const err = (key?: string) => (key ? t(key as MessageKey) : undefined);
  const { errors } = form.formState;

  return (
    <AuthCard title={t('auth.register.title')} description={t('auth.register.subtitle')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(({ email, password }) => register.mutate({ email, password }))}
      >
        <AuthError error={register.isError ? toAuthError(register.error) : null} />
        <TextField label={t('auth.field.email')} type="email" autoComplete="email" placeholder="name@company.com" error={err(errors.email?.message)} {...form.register('email')} />
        <TextField label={t('auth.field.password')} type="password" autoComplete="new-password" placeholder={t('auth.field.passwordHint')} error={err(errors.password?.message)} {...form.register('password')} />
        <TextField label={t('auth.field.confirmPassword')} type="password" autoComplete="new-password" error={err(errors.confirmPassword?.message)} {...form.register('confirmPassword')} />
        <Button type="submit" disabled={register.isPending}>
          {t('auth.register.submit')}
        </Button>
        <Link href="/login" className="text-sm text-primary hover:underline">
          {t('auth.register.toLogin')}
        </Link>
      </form>
    </AuthCard>
  );
}
