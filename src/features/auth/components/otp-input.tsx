'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

const LENGTH = 6;
/** Placeholder for an empty box so the digits after it keep their position; an incomplete code fails `otpField`. */
const EMPTY = ' ';

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
  const digits = Array.from({ length: LENGTH }, (_, i) => (value[i] && value[i] !== EMPTY ? value[i] : ''));
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  function setDigit(i: number, digit: string) {
    const next = digits.map((d) => d || EMPTY);
    next[i] = digit || EMPTY;
    onChange(next.join('').trimEnd());
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i]) {
      e.preventDefault();
      setDigit(i - 1, '');
      focus(i - 1);
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  }

  /** Several digits at once (paste, SMS autofill): a full code starts at box 1, a partial one at box `i`. */
  function fill(i: number, raw: string) {
    const start = raw.length >= LENGTH ? 0 : i;
    const next = digits.map((d) => d || EMPTY);
    raw.slice(0, LENGTH - start).split('').forEach((d, k) => (next[start + k] = d));
    onChange(next.join('').trimEnd());
    focus(start + Math.min(raw.length, LENGTH - start));
  }

  function onPaste(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    fill(i, pasted);
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
          maxLength={LENGTH}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid || undefined}
          onPaste={(e) => onPaste(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            // One keystroke adds one digit to what the box held; more than that is autofill.
            if (raw.length > (digit ? 2 : 1)) return fill(i, raw);
            const d = raw.slice(-1);
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
