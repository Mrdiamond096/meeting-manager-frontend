'use client';

import NextLink, { useLinkStatus } from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useI18n } from '@/i18n/i18n-provider';

function PendingLink() {
  const { pending } = useLinkStatus();
  const { t } = useI18n();
  return pending ? (
    <span role="status" className="ml-1 inline-flex items-center align-middle">
      <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
      <span className="sr-only">{t('loading.page')}</span>
    </span>
  ) : null;
}

export function ActionLink({ children, ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <PendingLink />
    </NextLink>
  );
}
