'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ActionLink as Link } from '@/components/ui/action-link';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { useActionNavigation } from '@/lib/use-action-navigation';
import type { MessageKey } from '@/i18n/dictionaries';
import { authApi } from '../api';
import { rememberChallengeEmail } from '../challenge-email';
import { toAuthError } from '../errors';
import { REGISTER_ROLES, registerSchema, type RegisterValues } from '../schemas';
import { AuthCard } from './auth-card';
import { AuthError } from './auth-error';
import { TextField } from './text-field';

export function RegisterForm() {
  const { t } = useI18n();
  const router = useActionNavigation();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', role: 'RECRUITER' },
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
  const role = form.watch('role');

  return (
    <AuthCard title={t('auth.register.title')} description={t('auth.register.subtitle')}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(({ email, password, role }) => register.mutate({ email, password, role }))}
      >
        <AuthError error={register.isError ? toAuthError(register.error) : null} />
        <TextField label={t('auth.field.email')} type="email" autoComplete="email" placeholder="name@company.com" error={err(errors.email?.message)} {...form.register('email')} />
        <TextField label={t('auth.field.password')} type="password" autoComplete="new-password" placeholder={t('auth.field.passwordHint')} error={err(errors.password?.message)} {...form.register('password')} />
        <TextField label={t('auth.field.confirmPassword')} type="password" autoComplete="new-password" error={err(errors.confirmPassword?.message)} {...form.register('confirmPassword')} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">{t('auth.field.role')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {REGISTER_ROLES.map((value) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer flex-col gap-0.5 rounded-md border border-input bg-card px-3 py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  role === value && 'border-primary bg-accent text-accent-foreground',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" value={value} className="accent-primary" {...form.register('role')} />
                  {t(`auth.role.${value}`)}
                </span>
                <span className="text-xs text-muted-foreground">{t(`auth.role.${value}.hint`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" loading={register.isPending || router.isNavigating}>
          {t('auth.register.submit')}
        </Button>
        <Link href="/login" className="text-sm text-primary hover:underline">
          {t('auth.register.toLogin')}
        </Link>
      </form>
    </AuthCard>
  );
}
