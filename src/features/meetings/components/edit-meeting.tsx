'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { meetingKeys, meetingsApi } from '../api';
import { MeetingForm } from './meeting-form';

export function EditMeeting({ id }: { id: string }) {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: ({ signal }) => meetingsApi.get(id, signal),
    // The form owns a copy of the data; never refetch underneath the user while they type.
    staleTime: Infinity,
  });

  if (query.isError) {
    const gone = isApiError(query.error, 'NOT_FOUND') || isApiError(query.error, 'VALIDATION_ERROR');
    return (
      <Alert tone="error" className="mx-auto max-w-2xl">
        <p className="font-medium">{t(gone ? 'meetingForm.notFound' : 'meetingForm.loadError')}</p>
        {gone ? null : (
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void query.refetch()}>
            {t('error.retry')}
          </Button>
        )}
      </Alert>
    );
  }

  if (!query.data) {
    return (
      <div aria-busy className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Keyed by version so a reload after a 409 remounts the form with the fresh values.
  return <MeetingForm key={query.data.version} meeting={query.data} onReload={() => void query.refetch()} />;
}
