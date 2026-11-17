'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActionLink as Link } from '@/components/ui/action-link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MeetingInfo } from '@/features/candidates/components/meeting-info';
import { MeetingNotes } from '@/features/candidates/components/meeting-notes';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { meetingKeys, meetingsApi } from '../api';

/** What a role that cannot edit sees at /meetings/:id/edit: the meeting and its notes, where feedback can be added. */
export function MeetingReadOnly({ id }: { id: string }) {
  const { t } = useI18n();
  const [now] = useState(() => new Date());
  const query = useQuery({ queryKey: meetingKeys.detail(id), queryFn: ({ signal }) => meetingsApi.get(id, signal) });

  if (query.isError) {
    const gone = isApiError(query.error, 'NOT_FOUND') || isApiError(query.error, 'VALIDATION_ERROR');
    return (
      <Alert tone="error" className="mx-auto max-w-2xl">
        <p className="font-medium">{t(gone ? 'meetingForm.notFound' : 'meetingForm.loadError')}</p>
        {gone ? null : (
          <Button variant="outline" size="sm" className="mt-2" loading={query.isFetching} onClick={() => void query.refetch()}>
            {t('error.retry')}
          </Button>
        )}
      </Alert>
    );
  }
  if (!query.data)
    return (
      <div aria-busy="true" className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );

  const meeting = query.data;
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← {t('candidate.back')}
      </Link>
      <h1 className="text-2xl font-semibold">{meeting.title}</h1>
      <MeetingInfo meeting={meeting} upcoming={new Date(meeting.dueDate) >= now} now={now} />
      <MeetingNotes meetingId={meeting.id} />
    </div>
  );
}
