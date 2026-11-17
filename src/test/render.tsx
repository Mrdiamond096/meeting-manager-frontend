import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { currentUserKey, type CurrentUser } from '@/components/shell/use-current-user';
import { Toaster } from '@/components/ui/toast';
import { I18nProvider } from '@/i18n/i18n-provider';

export const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
export let searchParams = new URLSearchParams();
export const setSearchParams = (query: string) => {
  searchParams = new URLSearchParams(query);
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => '/',
}));

/** The signed-in user most screens assume; an ADMIN sees every action. Pass `user: null` to leave it unknown. */
export const TEST_USER: CurrentUser = { id: 'u-admin', email: 'admin@example.test', role: 'ADMIN' };

export function renderWithProviders(ui: ReactElement, { user = TEST_USER }: { user?: CurrentUser | null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  if (user) client.setQueryData(currentUserKey, user);
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <I18nProvider locale="en">
          <Toaster>{ui}</Toaster>
        </I18nProvider>
      </QueryClientProvider>,
    ),
  };
}

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
