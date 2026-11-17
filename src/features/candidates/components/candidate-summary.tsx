'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { ActionLink as Link } from '@/components/ui/action-link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { ActionStatus } from '@/components/ui/action-status';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/features/meetings/components/status-badge';
import { candidateKeys, candidatesApi } from '@/features/meetings/api';
import { isPastMeeting } from '@/features/meetings/datetime';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { initials } from '@/lib/initials';
import { MeetingActions } from './meeting-actions';
import { MeetingInfo } from './meeting-info';
import { MeetingLinks } from './meeting-links';
import { MeetingNotes } from './meeting-notes';

export function CandidateSummary({ id }: { id: string }) {
  const { t, intl } = useI18n();
  const params = useSearchParams();
  const [now] = useState(() => new Date());
  const query = useQuery({ queryKey: candidateKeys.detail(id), queryFn: ({ signal }) => candidatesApi.get(id, signal) });

  if (query.isError) {
    const gone = isApiError(query.error, 'NOT_FOUND') || isApiError(query.error, 'VALIDATION_ERROR');
    return (
      <Alert tone="error" className="mx-auto max-w-2xl">
        <p className="font-medium">{t(gone ? 'candidate.notFound' : 'candidate.loadError')}</p>
        {!gone && isApiError(query.error) && query.error.requestId ? (
          <p className="mt-0.5 text-xs">
            {t('error.requestId')}: {query.error.requestId}
          </p>
        ) : null}
        {gone ? null : (
          <Button variant="outline" size="sm" className="mt-2" loading={query.isFetching} onClick={() => void query.refetch()}>
            {t('error.retry')}
          </Button>
        )}
      </Alert>
    );
  }

  if (!query.data) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Skeleton className="h-16 w-80" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const { candidate, upcoming, history } = query.data;
  const focusId = params.get('meeting');
  const focused = [...upcoming, ...history].find((m) => m.id === focusId) ?? upcoming[0] ?? history[0];
  const since = new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(new Date(candidate.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="inline-flex items-center gap-1 self-start text-sm text-primary hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        {t('candidate.back')}
      </Link>

      {query.isFetching ? <ActionStatus /> : null}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground"
          >
            {initials(candidate.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
              {focused ? <StatusBadge status={isPastMeeting(focused, now) ? 'PAST' : focused.status} /> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {candidate.position} · {t('candidate.since').replace('{date}', () => since)}
            </p>
          </div>
        </div>
        {focused ? <MeetingActions key={focused.id} meeting={focused} candidateId={candidate.id} /> : null}
      </header>

      {focused ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex flex-col gap-6">
            <MeetingInfo meeting={focused} upcoming={upcoming.some((m) => m.id === focused.id)} now={now} />
            <MeetingNotes key={focused.id} meetingId={focused.id} />
          </div>
          <div className="flex flex-col gap-6">
            {/* The info card already shows a single upcoming meeting; list it only when there is more to reach. */}
            {upcoming.length > 1 || (upcoming.length === 1 && upcoming[0].id !== focused.id) ? (
              <MeetingLinks
                title={t('candidate.upcoming')}
                meetings={upcoming}
                candidateId={candidate.id}
                focusedId={focused.id}
                now={now}
              />
            ) : null}
            <MeetingLinks
              title={t('candidate.history')}
              meetings={history}
              emptyText={t('candidate.noHistory')}
              candidateId={candidate.id}
              focusedId={focused.id}
              now={now}
            />
          </div>
        </div>
      ) : (
        <Card className="px-6 py-12 text-center text-sm text-muted-foreground">{t('candidate.empty')}</Card>
      )}
    </div>
  );
}
