'use client';

import { Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/i18n-provider';
import type { MessageKey } from '@/i18n/dictionaries';

export function ActionStatus({ message = 'loading.data' }: { message?: MessageKey }) {
  const { t } = useI18n();
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
      {t(message)}
    </p>
  );
}
