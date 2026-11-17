'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { ActionStatus } from '@/components/ui/action-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError, Label, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useCurrentUser } from '@/components/shell/use-current-user';
import { meetingKeys, meetingsApi } from '@/features/meetings/api';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { FEEDBACK_FIELD_ID } from './meeting-actions';

const MAX = 5000;

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
      {query.isFetching ? <ActionStatus /> : null}
        {query.isError ? (
          <Alert tone="error">
            <p className="font-medium">{t('candidate.notes.loadError')}</p>
            {isApiError(query.error) && query.error.requestId ? (
              <p className="mt-0.5 text-xs">
                {t('error.requestId')}: {query.error.requestId}
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="mt-2" loading={query.isFetching} onClick={() => void query.refetch()}>
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
        <AddFeedback meetingId={meetingId} />
      </CardContent>
    </Card>
  );
}

function AddFeedback({ meetingId }: { meetingId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (text: string) => meetingsApi.addFeedback(meetingId, text),
    onSuccess: async () => {
      setBody('');
      await queryClient.invalidateQueries({ queryKey: meetingKeys.detail(meetingId) });
      toast({ tone: 'success', title: t('candidate.notes.added') });
    },
    onError: (e) =>
      setError(
        isApiError(e, 'VALIDATION_ERROR')
          ? (e.details?.[0]?.message ?? t('candidate.notes.addError'))
          : [t('candidate.notes.addError'), isApiError(e) && e.requestId ? `${t('error.requestId')}: ${e.requestId}` : null].filter(Boolean).join(' '),
      ),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return setError(t('candidate.notes.required'));
    if (text.length > MAX) return setError(t('candidate.notes.max'));
    setError(null);
    add.mutate(text);
  }

  const errorId = `${FEEDBACK_FIELD_ID}-error`;
  return (
    <form noValidate onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <Label htmlFor={FEEDBACK_FIELD_ID}>{t('candidate.notes.add')}</Label>
      <Textarea
        disabled={add.isPending}
        id={FEEDBACK_FIELD_ID}
        value={body}
        placeholder={t('candidate.notes.placeholder')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => setBody(e.target.value)}
      />
      <FieldError id={errorId}>{error ?? undefined}</FieldError>
      <Button type="submit" className="self-end" loading={add.isPending}>
        {t('candidate.notes.add')}
      </Button>
    </form>
  );
}
