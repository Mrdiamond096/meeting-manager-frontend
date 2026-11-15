'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Six single-digit boxes backed by one string value; supports typing, backspace, arrows and paste. */
export function OtpInput({ value, onChange, label, invalid, disabled, autoFocus }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  function setDigit(i: number, digit: string) {
    const next = digits.slice();
    next[i] = digit;
    onChange(next.join('').slice(0, LENGTH));
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i]) {
      e.preventDefault();
      setDigit(i - 1, '');
      focus(i - 1);
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  }

  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid || undefined}
          onPaste={onPaste}
          onKeyDown={(e) => onKeyDown(i, e)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            setDigit(i, d);
            if (d) focus(i + 1);
          }}
          className={cn(
            'size-11 rounded-md border border-input bg-card text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
            invalid && 'border-destructive',
          )}
        />
      ))}
    </div>
  );
}
