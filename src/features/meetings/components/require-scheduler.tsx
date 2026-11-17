'use client';

import type { ReactNode } from 'react';
import { ActionLink as Link } from '@/components/ui/action-link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/i18n-provider';
import { usePermissions } from '@/lib/permissions';

/** Interviewers opening a create/edit URL directly get an explanation instead of a form the API would refuse. */
export function RequireScheduler({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user, canSchedule } = usePermissions();
  if (!user || canSchedule) return children;
  return (
    <Alert tone="error" className="mx-auto max-w-2xl">
      <p className="font-medium">{t('meetings.forbidden')}</p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/">{t('candidate.back')}</Link>
      </Button>
    </Alert>
  );
}
