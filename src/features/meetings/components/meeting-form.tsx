'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useActionNavigation } from '@/lib/use-action-navigation';
import { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/i18n/i18n-provider';
import { emptyFormValues, meetingFormSchema, meetingToFormValues, type MeetingFormValues } from '../form';
import { useSaveMeeting } from '../hooks/use-save-meeting';
import type { Meeting } from '../types';
import { MeetingInterviewerFields } from './meeting-interviewer-fields';
import { MeetingCandidateFields } from './meeting-candidate-fields';
import { MeetingDetailsFields } from './meeting-details-fields';
import { MeetingScheduleFields } from './meeting-schedule-fields';

interface MeetingFormProps {
  /** Present when editing. */
  meeting?: Meeting;
  refreshing?: boolean;
  cancelHref?: string;
  /** Called after a 409 so the container can refetch the latest version. */
  onReload?: () => void;
  /** Start picked from an empty calendar slot (new meetings only). */
  startAt?: { date: string; time: string };
}

export function MeetingForm({ meeting, onReload, startAt, refreshing, cancelHref = '/' }: MeetingFormProps) {
  const { t } = useI18n();
  const router = useActionNavigation();
  const editing = Boolean(meeting);
  const initial = useMemo(
    () => (meeting ? meetingToFormValues(meeting) : emptyFormValues(new Date(), startAt)),
    [meeting, startAt?.date, startAt?.time],
  );
  const form = useForm<MeetingFormValues>({ resolver: zodResolver(meetingFormSchema), defaultValues: initial });
  const { save, formError, conflict, setConflict, isNavigating } = useSaveMeeting({
    meeting,
    initial,
    setError: form.setError,
  });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="mx-auto flex w-full max-w-2xl flex-col gap-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(editing ? 'meetingForm.edit.title' : 'meetingForm.create.title')}
        </h1>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <MeetingCandidateFields />
        <MeetingInterviewerFields meeting={meeting} />
        <MeetingScheduleFields initial={initial} meeting={meeting} />
        <MeetingDetailsFields meeting={meeting} />

        <div className="flex justify-end gap-3 border-t border-border pt-6">
          <Button
            variant="outline"
            disabled={save.isPending || isNavigating}
            loading={router.isNavigating}
            onClick={() => router.push(cancelHref)}
          >
            {t('meetingForm.cancel')}
          </Button>
          <Button type="submit" loading={save.isPending || isNavigating} disabled={router.isNavigating || refreshing}>
            {t(editing ? 'meetingForm.submit.edit' : 'meetingForm.submit.create')}
          </Button>
        </div>
      </form>

      <Dialog open={conflict} onOpenChange={setConflict}>
        <DialogContent>
          <DialogTitle>{t('meetingForm.conflict.title')}</DialogTitle>
          <DialogDescription>{t('meetingForm.conflict.body')}</DialogDescription>
          <DialogFooter>
            <Button
              onClick={() => {
                setConflict(false);
                onReload?.();
              }}
            >
              {t('meetingForm.conflict.reload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
