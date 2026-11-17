'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActionNavigation } from '@/lib/use-action-navigation';
import { useState, type ReactNode } from 'react';
import type { UseFormSetError } from 'react-hook-form';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { candidateKeys, meetingKeys, meetingsApi } from '../api';
import { mapApiErrors, toCreateBody, toUpdateBody, type MeetingFormValues } from '../form';
import type { Meeting } from '../types';

interface SaveMeetingOptions {
  meeting?: Meeting;
  initial: MeetingFormValues;
  setError: UseFormSetError<MeetingFormValues>;
}

export function useSaveMeeting({ meeting, initial, setError }: SaveMeetingOptions) {
  const { t } = useI18n();
  const router = useActionNavigation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = Boolean(meeting);
  const [conflict, setConflict] = useState(false);
  const [formError, setFormError] = useState<ReactNode>(null);
  const save = useMutation({
    mutationFn: async (values: MeetingFormValues) => {
      if (!meeting) return meetingsApi.create(toCreateBody(values));
      const body = toUpdateBody(meeting, initial, values);
      return body ? meetingsApi.update(meeting.id, body) : null;
    },
    onSuccess: async (saved) => {
      if (saved === null) {
        toast({ tone: 'info', title: t('meetingForm.noChanges') });
        router.push('/');
        return;
      }
      // The candidate summary caches meetings too: refresh the old and the new candidate when it changed.
      const candidateIds = new Set([meeting?.candidate?.id, saved.candidate?.id].filter((id) => id !== undefined));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meetingKeys.all }),
        ...[...candidateIds].map((id) => queryClient.invalidateQueries({ queryKey: candidateKeys.detail(id) })),
      ]);
      toast({ tone: 'success', title: t(editing ? 'meetingForm.saved.edit' : 'meetingForm.saved.create') });
      router.push('/');
    },
    onError: (error) => {
      setFormError(null);
      if (!isApiError(error)) return setFormError(t('meetingForm.error.generic'));
      if (error.code === 'VERSION_CONFLICT') return setConflict(true);
      if (error.code === 'VALIDATION_ERROR') {
        const { fields, unmapped } = mapApiErrors(error.details);
        for (const [name, message] of Object.entries(fields)) setError(name as keyof MeetingFormValues, { message });
        if (unmapped.length) setFormError(unmapped.join('. '));
        else if (!Object.keys(fields).length) setFormError(t('meetingForm.error.generic'));
        return;
      }
      if (error.code === 'INVALID_TRANSITION') return setFormError(t('meetingForm.error.transition'));
      if (error.code === 'NOT_FOUND')
        return setFormError(t(editing ? 'meetingForm.notFound' : 'meetingForm.error.candidateGone'));
      setFormError(
        <>
          {t('meetingForm.error.generic')}
          {error.requestId ? (
            <span className="mt-0.5 block text-xs">
              {t('error.requestId')}: {error.requestId}
            </span>
          ) : null}
        </>,
      );
    },
  });

  return { save, formError, conflict, setConflict, isNavigating: router.isNavigating };
}
