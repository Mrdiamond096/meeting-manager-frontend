'use client';

import { useId, type ComponentProps } from 'react';
import { FieldError, Input, Label } from '@/components/ui/input';

interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...input }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...input} />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
