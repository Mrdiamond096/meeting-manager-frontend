'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n/i18n-provider';
import { LOCALES } from '@/i18n/dictionaries';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { BrandLogo } from './brand-logo';
import { useCurrentUser } from './use-current-user';

function initials(email: string | undefined): string {
  return (email ?? '?').slice(0, 2).toUpperCase();
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t('shell.language')} className="flex items-center gap-1 text-sm">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 ? <span className="text-muted-foreground">/</span> : null}
          <button
            type="button"
            aria-pressed={locale === l}
            onClick={() => setLocale(l)}
            className={cn(
              'rounded-sm px-0.5 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              locale === l ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}

export function AppHeader() {
  const { t } = useI18n();
  const { data: user } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      window.location.assign('/login');
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandLogo />
          <span className="hidden text-sm font-semibold sm:inline">{t('app.title')}</span>
        </Link>
        <div className="flex-1" />
        <LanguageSwitch />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('shell.userMenu')}
            className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {initials(user?.email)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user ? <DropdownMenuLabel>{user.email}</DropdownMenuLabel> : null}
            {user ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem disabled={loggingOut} onSelect={() => void logout()}>
              <LogOut className="size-4" />
              {t('shell.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
