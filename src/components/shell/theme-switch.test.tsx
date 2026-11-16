import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { beforeAll, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/i18n-provider';
import { ThemeSwitch } from './theme-switch';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

beforeAll(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
});

it('switches the html class when a theme is picked', async () => {
  render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider locale="en">
        <ThemeSwitch />
      </I18nProvider>
    </ThemeProvider>,
  );

  await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
  await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Dark' }));
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));

  await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
  await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Light' }));
  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false));
});
