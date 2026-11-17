'use client';

import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { FieldError, Label } from '@/components/ui/input';
import type { MessageKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/i18n-provider';
import type { MeetingFormValues } from '../form';

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError id={`${htmlFor}-error`}>{error}</FieldError>
    </div>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function useMeetingFieldError() {
  const { t } = useI18n();
  const {
    formState: { errors },
  } = useFormContext<MeetingFormValues>();
  const fieldError = (name: keyof MeetingFormValues) => {
    const message = errors[name]?.message;
    if (typeof message !== 'string') return undefined;
    return message.startsWith('meetings.validation.') ? t(message as MessageKey) : message;
  };
  return fieldError;
}
