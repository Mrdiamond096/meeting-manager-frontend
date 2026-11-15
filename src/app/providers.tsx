'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setNonce } from 'get-nonce';
import { useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/toast';
import { I18nProvider } from '@/i18n/i18n-provider';
import type { Locale } from '@/i18n/dictionaries';
import { isApiError } from '@/lib/api';
import { isPublicPath, loginRedirect } from '@/lib/routes';

function redirectOnUnauthenticated(err: unknown) {
  if (!isApiError(err, 'UNAUTHENTICATED')) return;
  const { pathname, search } = window.location;
  if (!isPublicPath(pathname)) window.location.assign(loginRedirect(pathname, search));
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: redirectOnUnauthenticated }),
    mutationCache: new MutationCache({ onError: redirectOnUnauthenticated }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry only transient failures; 4xx are final.
        retry: (count, err) => count < 2 && (!isApiError(err) || err.status === 0 || err.status >= 500),
      },
    },
  });
}

interface ProvidersProps {
  locale: Locale;
  /** CSP nonce for style tags injected at runtime (Radix scroll lock via react-style-singleton). */
  nonce?: string;
  children: ReactNode;
}

export function Providers({ locale, nonce, children }: ProvidersProps) {
  const [client] = useState(() => {
    if (nonce) setNonce(nonce);
    return makeQueryClient();
  });
  return (
    <QueryClientProvider client={client}>
      <I18nProvider locale={locale}>
        <Toaster>{children}</Toaster>
      </I18nProvider>
    </QueryClientProvider>
  );
}
