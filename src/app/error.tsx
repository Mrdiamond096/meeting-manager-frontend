'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  const requestId = isApiError(error) ? error.requestId : error.digest;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{t('error.title')}</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {requestId ? (
        <p className="text-xs text-muted-foreground">
          {t('error.requestId')}: <code className="font-mono">{requestId}</code>
        </p>
      ) : null}
      <Button onClick={reset}>{t('error.retry')}</Button>
    </div>
  );
}
