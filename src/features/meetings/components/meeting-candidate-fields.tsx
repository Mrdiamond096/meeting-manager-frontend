'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { candidateKeys, candidatesApi } from '../api';
import type { MeetingFormValues } from '../form';
import { CandidateCombobox } from './candidate-combobox';
import { Field, Group, useMeetingFieldError } from './meeting-form-fields';

export function MeetingCandidateFields() {
  const { t } = useI18n();
  const uid = useId();
  const { register, watch, setValue, getValues, formState } = useFormContext<MeetingFormValues>();
  const fieldError = useMeetingFieldError();
  const candidateMode = watch('candidateMode');
  const candidate = watch('candidate');
  const newName = watch('newName');
  const positions = useQuery({
    queryKey: candidateKeys.positions,
    queryFn: ({ signal }) => candidatesApi.positions(signal),
    enabled: candidateMode === 'new',
    staleTime: Infinity,
  });

  // Suggest "Interview: <name>" while the title is empty or still the previous suggestion.
  const suggested = useRef<string | null>(null);
  const candidateName = candidateMode === 'existing' ? candidate?.name : candidateMode === 'new' ? newName.trim() : '';
  useEffect(() => {
    if (!candidateName) return;
    const current = getValues('title');
    if (current === '' || current === suggested.current) {
      suggested.current = `Interview: ${candidateName}`;
      setValue('title', suggested.current, { shouldValidate: formState.isSubmitted });
    }
  }, [candidateName, getValues, setValue, formState.isSubmitted]);

  return (
    <Group title={t('meetingForm.group.candidate')}>
      {candidateMode === 'new' ? (
        <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
          <Field label={t('meetingForm.candidate.name')} htmlFor={`${uid}-name`} error={fieldError('newName')}>
            <Input
              id={`${uid}-name`}
              autoComplete="off"
              aria-invalid={formState.errors.newName ? true : undefined}
              aria-describedby={formState.errors.newName ? `${uid}-name-error` : undefined}
              {...register('newName')}
            />
          </Field>
          <Field
            label={t('meetingForm.candidate.position')}
            htmlFor={`${uid}-position`}
            error={fieldError('newPosition')}
          >
            <Select
              id={`${uid}-position`}
              aria-invalid={formState.errors.newPosition ? true : undefined}
              aria-describedby={formState.errors.newPosition ? `${uid}-position-error` : undefined}
              {...register('newPosition')}
            >
              <option value="">{t('meetingForm.candidate.selectPosition')}</option>
              {(positions.data ?? []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          {positions.isError ? (
            <Alert tone="error">
              <p className="font-medium">{t('meetingForm.candidate.positionsError')}</p>
              {isApiError(positions.error) && positions.error.requestId ? (
                <p className="mt-0.5 text-xs">
                  {t('error.requestId')}: {positions.error.requestId}
                </p>
              ) : null}
              <Button variant="outline" size="sm" className="mt-2" loading={positions.isFetching} onClick={() => void positions.refetch()}>
                {t('error.retry')}
              </Button>
            </Alert>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setValue('candidateMode', 'none');
              setValue('newName', '');
              setValue('newPosition', '');
            }}
          >
            {t('meetingForm.candidate.useExisting')}
          </Button>
        </div>
      ) : (
        <CandidateCombobox
          value={candidateMode === 'existing' ? candidate : null}
          error={fieldError('candidate')}
          onSelect={(c) => {
            setValue('candidate', c, { shouldValidate: true });
            setValue('candidateMode', 'existing');
          }}
          onClear={() => {
            setValue('candidate', null);
            setValue('candidateMode', 'none');
          }}
          onCreateNew={(name) => {
            setValue('newName', name);
            setValue('candidateMode', 'new');
          }}
        />
      )}
    </Group>
  );
}
