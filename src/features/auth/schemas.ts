import { z } from 'zod';
import type { MessageKey } from '@/i18n/dictionaries';

// Messages are dictionary keys; forms translate them when rendering (contract §3 rules).
const msg = (key: MessageKey) => ({ message: key });

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export const emailField = z.string().trim().min(1, msg('auth.validation.emailRequired')).max(254).email(msg('auth.validation.emailInvalid'));

export const passwordField = z
  .string()
  .min(8, msg('auth.validation.passwordMin'))
  .refine((v) => byteLength(v) <= 72, msg('auth.validation.passwordMax'));

export const otpField = z.string().regex(/^\d{6}$/, msg('auth.validation.otpFormat'));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, msg('auth.validation.passwordRequired')),
});

const withConfirm = <T extends z.ZodRawShape>(shape: T, field: 'password' | 'newPassword') =>
  z
    .object({ ...shape, confirmPassword: z.string() })
    .refine((v) => (v as Record<string, unknown>)[field] === v.confirmPassword, {
      path: ['confirmPassword'],
      ...msg('auth.validation.passwordMismatch'),
    });

export const registerSchema = withConfirm({ email: emailField, password: passwordField }, 'password');
export const forgotSchema = z.object({ email: emailField });
export const resetSchema = withConfirm({ code: otpField, newPassword: passwordField }, 'newPassword');
export const verifySchema = z.object({ code: otpField });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
export type VerifyValues = z.infer<typeof verifySchema>;

/** Only same-app relative paths are allowed as post-login redirects (no open redirect). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
