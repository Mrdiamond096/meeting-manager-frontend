import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Button } from './button';

it('keeps the action label, blocks repeat clicks while loading, and recovers afterward', async () => {
  const onClick = vi.fn();
  const { rerender } = render(
    <Button loading onClick={onClick}>
      Save
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(button.querySelector('svg')).toBeTruthy();
  await userEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
  rerender(<Button onClick={onClick}>Save</Button>);
  expect(button.disabled).toBe(false);
  expect(button.hasAttribute('aria-busy')).toBe(false);
  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('preserves the slotted link and its props without an extra button', () => {
  render(
    <Button asChild variant="outline">
      <a href="/meetings/new" target="_blank">
        Schedule
      </a>
    </Button>,
  );
  const link = screen.getByRole('link', { name: 'Schedule' });
  expect(link.getAttribute('href')).toBe('/meetings/new');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(screen.queryByRole('button')).toBeNull();
});
