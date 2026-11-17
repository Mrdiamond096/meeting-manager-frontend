'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ActionLink as Link } from '@/components/ui/action-link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-provider';
import { useActionNavigation } from '@/lib/use-action-navigation';
import type { MessageKey } from '@/i18n/dictionaries';
import { authApi } from '../api';
import { rememberChallengeEmail } from '../challenge-email';
import { toAuthError } from '../errors';
import { loginSchema, safeNext, type LoginValues } from '../schemas';
import { AuthCard } from './auth-card';
import { AuthError } from './auth-error';
import { TextField } from './text-field';

export function LoginForm() {
  const { t } = useI18n();
  const router = useActionNavigation();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ challengeId }, { email }) => {
      rememberChallengeEmail(challengeId, email.trim().toLowerCase());
      router.push(`/verify?${new URLSearchParams({ c: challengeId, next })}`);
    },
  });
  const err = (key?: string) => (key ? t(key as MessageKey) : undefined);

  return (
    <AuthCard title={t('app.title')} description={t('auth.login.subtitle')}>
      <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => login.mutate(v))}>
        {params.get('reset') === '1' ? <Alert tone="success">{t('auth.reset.done')}</Alert> : null}
        <AuthError error={login.isError ? toAuthError(login.error) : null} />
        <TextField
          label={t('auth.field.email')}
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          error={err(form.formState.errors.email?.message)}
          {...form.register('email')}
        />
        <TextField
          label={t('auth.field.password')}
          type="password"
          autoComplete="current-password"
          error={err(form.formState.errors.password?.message)}
          {...form.register('password')}
        />
        <Button type="submit" loading={login.isPending || router.isNavigating}>
          {t('auth.login.submit')}
        </Button>
        <div className="flex justify-between text-sm">
          <Link href="/register" className="text-primary hover:underline">
            {t('auth.login.toRegister')}
          </Link>
          <Link href="/forgot-password" className="text-primary hover:underline">
            {t('auth.login.toForgot')}
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
