import type { ReactNode } from 'react';
import { AppHeader } from '@/components/shell/app-header';
import { getT } from '@/i18n/server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        {t('shell.skipToContent')}
      </a>
      <AppHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        {children}
      </main>
    </>
  );
}
