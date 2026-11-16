import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it } from 'vitest';
import { otpField } from '../schemas';
import { OtpInput } from './otp-input';

let latest = '';
function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  latest = value;
  return <OtpInput label="Code" value={value} onChange={setValue} />;
}

const box = (n: number) => screen.getByRole('textbox', { name: `Code ${n}` }) as HTMLInputElement;
const boxes = () => [1, 2, 3, 4, 5, 6].map((n) => box(n).value).join('');

it('keeps the other digits in place when a middle digit is cleared and retyped', async () => {
  render(<Harness initial="123456" />);
  await userEvent.clear(box(2));
  expect(boxes()).toBe('13456');
  expect(box(3).value).toBe('3');
  expect(otpField.safeParse(latest).success).toBe(false);

  await userEvent.type(box(2), '2');
  expect(latest).toBe('123456');
  expect(otpField.safeParse(latest).success).toBe(true);
});

it('replaces a wrong middle digit without shifting the rest', async () => {
  render(<Harness initial="123456" />);
  await userEvent.clear(box(4));
  await userEvent.type(box(4), '9');
  expect(latest).toBe('123956');
});

it('backspace on an empty middle box clears the previous one in place', async () => {
  render(<Harness initial="123456" />);
  await userEvent.clear(box(3));
  await userEvent.type(box(3), '{Backspace}');
  expect([1, 2, 3, 4, 5, 6].map((n) => box(n).value)).toEqual(['1', '', '', '4', '5', '6']);
  expect(box(2)).toBe(document.activeElement);
});

it('typing from empty fills boxes left to right', async () => {
  render(<Harness />);
  await userEvent.type(box(1), '123456');
  expect(latest).toBe('123456');
});
