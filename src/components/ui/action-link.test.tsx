import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';
import '@/test/render';
import { I18nProvider } from '@/i18n/i18n-provider';
import { ActionLink } from './action-link';

const state = vi.hoisted(() => ({ pending: false }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useLinkStatus: () => state,
}));

it('shows pending navigation feedback and clears it when Next completes', () => {
  const { rerender } = render(
    <ActionLink href="/meetings/new" target="_blank">
      Schedule
    </ActionLink>,
    { wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider> },
  );
  expect(screen.queryByRole('status')).toBeNull();
  state.pending = true;
  rerender(
    <ActionLink href="/meetings/new" target="_blank">
      Schedule
    </ActionLink>,
  );
  expect(screen.getByRole('status').textContent).toBe('Opening page…');
  expect(screen.getByRole('link').getAttribute('target')).toBe('_blank');
  expect(screen.getByRole('link').getAttribute('href')).toBe('/meetings/new');
  state.pending = false;
  rerender(<ActionLink href="/meetings/new">Schedule</ActionLink>);
  expect(screen.queryByRole('status')).toBeNull();
});
