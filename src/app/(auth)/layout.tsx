import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/shell/app-header';
import { BrandLogo } from '@/components/shell/brand-logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        <BrandLogo />
        <LanguageSwitch />
      </div>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 md:items-center md:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
