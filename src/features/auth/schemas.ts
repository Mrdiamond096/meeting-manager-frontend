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
    .refine((v) => (v as Record<string, unknown>)[field] === (v as Record<string, unknown>).confirmPassword, {
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

const NEXT_BASE = 'http://app.invalid';

/**
 * Only same-app paths are allowed as post-login redirects (no open redirect).
 * The value is parsed the way the browser will (which strips tabs/newlines and treats `\\` as `/`),
 * and only the normalised path is returned when it stays on our origin.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/';
  let url: URL;
  try {
    url = new URL(next, NEXT_BASE);
  } catch {
    return '/';
  }
  return url.origin === NEXT_BASE ? `${url.pathname}${url.search}${url.hash}` : '/';
}
