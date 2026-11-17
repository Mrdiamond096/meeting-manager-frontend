'use client';

import type { ReactNode } from 'react';
import { ActionLink as Link } from '@/components/ui/action-link';
import { ActionStatus } from '@/components/ui/action-status';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/components/shell/use-current-user';
import { useI18n } from '@/i18n/i18n-provider';
import { canSchedule } from '@/lib/permissions';

/**
 * Create/edit forms render only once the role is known, so nothing typed before the answer is thrown away.
 * A role that cannot schedule gets `readOnly` (e.g. the meeting itself) or an explanation instead.
 * If the role cannot be loaded the guard stays closed and offers Retry; a role already cached is still used.
 */
export function RequireScheduler({ children, readOnly }: { children: ReactNode; readOnly?: ReactNode }) {
  const { t } = useI18n();
  const { data: user, isPending, isError, isFetching, refetch } = useCurrentUser();
  if (!user && isError)
    return (
      <Alert tone="error" className="mx-auto max-w-2xl">
        <p className="font-medium">{t('auth.roleError')}</p>
        <Button variant="outline" size="sm" className="mt-2" loading={isFetching} onClick={() => void refetch()}>
          {t('error.retry')}
        </Button>
      </Alert>
    );
  if (!user && isPending)
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <ActionStatus />
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  if (canSchedule(user?.role)) return children;
  if (readOnly) return readOnly;
  return (
    <Alert tone="error" className="mx-auto max-w-2xl">
      <p className="font-medium">{t('meetings.forbidden')}</p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/">{t('candidate.back')}</Link>
      </Button>
    </Alert>
  );
}
