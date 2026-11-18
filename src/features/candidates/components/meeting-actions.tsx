'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionLink as Link } from '@/components/ui/action-link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { candidateKeys, meetingKeys, meetingsApi } from '@/features/meetings/api';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { editMeetingHref } from '@/lib/routes';

type Confirm = 'cancel' | 'delete' | 'conflict' | null;

export const FEEDBACK_FIELD_ID = 'add-feedback';

/** Actions for the meeting currently selected in the candidate summary. */
export function MeetingActions({
  meeting,
  candidateId,
  editing = false,
}: {
  meeting: Meeting;
  candidateId?: string;
  editing?: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: meetingKeys.all }),
      ...(candidateId ? [queryClient.invalidateQueries({ queryKey: candidateKeys.detail(candidateId) })] : []),
    ]);

  const onError = (e: unknown) => {
    if (isApiError(e, 'VERSION_CONFLICT') || isApiError(e, 'INVALID_TRANSITION') || isApiError(e, 'NOT_FOUND')) {
      return setConfirm('conflict');
    }
    setError(
      [t('candidate.actions.error'), isApiError(e) && e.requestId ? `${t('error.requestId')}: ${e.requestId}` : null]
        .filter(Boolean)
        .join(' '),
    );
  };

  const cancel = useMutation({
    mutationFn: () => meetingsApi.cancel(meeting.id, meeting.version),
    onSuccess: async () => {
      setConfirm(null);
      await refresh();
      toast({ tone: 'success', title: t('candidate.cancel.done') });
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: () => meetingsApi.remove(meeting.id, meeting.version),
    onSuccess: async () => {
      setConfirm(null);
      queryClient.removeQueries({ queryKey: meetingKeys.detail(meeting.id) });
      await refresh();
      toast({ tone: 'success', title: t('candidate.delete.done') });
      router.push('/');
    },
    onError,
  });

  const busy = cancel.isPending || remove.isPending;
  const { canEdit, canDelete } = usePermissions();
  const editable = canEdit(meeting);
  const open = (next: Confirm) => {
    setError(null);
    setConfirm(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canDelete(meeting) ? (
        <Button variant="ghost" disabled={busy} onClick={() => open('delete')}>
          {t('candidate.actions.delete')}
        </Button>
      ) : null}
      {editable && meeting.status !== 'CANCELLED' ? (
        <Button variant="outline" disabled={busy} onClick={() => open('cancel')}>
          {t('candidate.actions.cancel')}
        </Button>
      ) : null}
      {editable && !editing ? (
        <Button asChild variant="outline">
          <Link href={editMeetingHref(meeting.id)}>{t('candidate.edit')}</Link>
        </Button>
      ) : null}
      <Button onClick={() => document.getElementById(FEEDBACK_FIELD_ID)?.focus()}>{t('candidate.notes.add')}</Button>

      <Dialog open={confirm === 'cancel' || confirm === 'delete'} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogTitle>{t(confirm === 'delete' ? 'candidate.delete.title' : 'candidate.cancel.title')}</DialogTitle>
          <DialogDescription>
            {t(confirm === 'delete' ? 'candidate.delete.body' : 'candidate.cancel.body')}
          </DialogDescription>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              {t(confirm === 'delete' ? 'candidate.actions.back' : 'candidate.actions.keep')}
            </Button>
            {confirm === 'delete' ? (
              <Button variant="destructive" loading={remove.isPending} disabled={busy} onClick={() => remove.mutate()}>
                {t('candidate.delete.confirm')}
              </Button>
            ) : (
              <Button loading={cancel.isPending} disabled={busy} onClick={() => cancel.mutate()}>
                {t('candidate.actions.cancel')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm === 'conflict'} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogTitle>{t('candidate.conflict.title')}</DialogTitle>
          <DialogDescription>{t('candidate.conflict.body')}</DialogDescription>
          <DialogFooter>
            <Button
              onClick={() => {
                setConfirm(null);
                void refresh();
              }}
            >
              {t('candidate.conflict.reload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
