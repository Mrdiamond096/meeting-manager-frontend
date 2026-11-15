import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { getLocale } from '@/i18n/server';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Candidate Meeting Scheduler',
  description: 'Schedule and manage candidate interviews',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Reading the nonce forces dynamic rendering so every response gets a fresh CSP nonce (ADR-013).
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${plexThai.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <Providers locale={locale} nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
