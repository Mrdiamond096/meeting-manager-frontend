'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/components/shell/use-current-user';
import { meetingKeys, meetingsApi } from '@/features/meetings/api';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';

/** Feedback of one meeting, newest first (append-only, no author names in the contract: own notes say "You"). */
export function MeetingNotes({ meetingId }: { meetingId: string }) {
  const { t, intl, locale } = useI18n();
  const me = useCurrentUser();
  const query = useQuery({ queryKey: meetingKeys.detail(meetingId), queryFn: ({ signal }) => meetingsApi.get(meetingId, signal) });
  const when = new Intl.DateTimeFormat(intl, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale === 'en',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('candidate.notes.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {query.isError ? (
          <Alert tone="error">
            <p className="font-medium">{t('candidate.notes.loadError')}</p>
            {isApiError(query.error) && query.error.requestId ? (
              <p className="mt-0.5 text-xs">
                {t('error.requestId')}: {query.error.requestId}
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void query.refetch()}>
              {t('error.retry')}
            </Button>
          </Alert>
        ) : !query.data ? (
          <Skeleton aria-busy className="h-16 w-full" />
        ) : query.data.feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('candidate.notes.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {query.data.feedback.map((f) => (
              <li key={f.id} className="rounded-md bg-secondary px-3 py-2">
                <p className="tabular text-xs text-muted-foreground">
                  {f.createdById && f.createdById === me.data?.id ? t('candidate.notes.you') : t('candidate.notes.teammate')} ·{' '}
                  {when.format(new Date(f.createdAt))}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
