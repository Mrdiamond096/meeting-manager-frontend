'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { FieldError, Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import type { MessageKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { candidateKeys, candidatesApi, meetingKeys, meetingsApi } from '../api';
import { TIME_SLOTS } from '../datetime';
import {
  emptyFormValues,
  KEEP_END,
  mapApiErrors,
  meetingFormSchema,
  meetingToFormValues,
  toCreateBody,
  toUpdateBody,
  type MeetingFormValues,
} from '../form';
import { PROVIDERS, type Meeting } from '../types';
import { CandidateCombobox } from './candidate-combobox';

interface MeetingFormProps {
  /** Present when editing. */
  meeting?: Meeting;
  /** Called after a 409 so the container can refetch the latest version. */
  onReload?: () => void;
}

function Field({ label, error, htmlFor, children }: { label: string; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError id={`${htmlFor}-error`}>{error}</FieldError>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function MeetingForm({ meeting, onReload }: MeetingFormProps) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const uid = useId();
  const editing = Boolean(meeting);
  const initial = useMemo(() => (meeting ? meetingToFormValues(meeting) : emptyFormValues(new Date())), [meeting]);
  const form = useForm<MeetingFormValues>({ resolver: zodResolver(meetingFormSchema), defaultValues: initial });
  const { register, watch, setValue, setError, formState } = form;
  const [conflict, setConflict] = useState(false);
  const [formError, setFormError] = useState<ReactNode>(null);

  const candidateMode = watch('candidateMode');
  const candidate = watch('candidate');
  const newName = watch('newName');
  const meetingType = watch('meetingType');
  // Client validation messages are i18n keys; messages set from API details are shown as received.
  const fieldError = (name: keyof MeetingFormValues) => {
    const message = formState.errors[name]?.message;
    if (typeof message !== 'string') return undefined;
    return message.startsWith('meetings.validation.') ? t(message as MessageKey) : message;
  };

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
    const current = form.getValues('title');
    if (current === '' || current === suggested.current) {
      suggested.current = `Interview: ${candidateName}`;
      setValue('title', suggested.current, { shouldValidate: formState.isSubmitted });
    }
  }, [candidateName, form, setValue, formState.isSubmitted]);

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
      await queryClient.invalidateQueries({ queryKey: meetingKeys.all });
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
      if (error.code === 'NOT_FOUND') return setFormError(t(editing ? 'meetingForm.notFound' : 'meetingForm.error.candidateGone'));
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

  const timeOptions = (current: string) => (current && !TIME_SLOTS.includes(current) ? [...TIME_SLOTS, current].sort() : TIME_SLOTS);
  const typeCard = (value: 'ONSITE' | 'ONLINE') => (
    <label
      key={value}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
        meetingType === value && 'border-primary bg-accent text-accent-foreground',
      )}
    >
      <input type="radio" value={value} className="accent-primary" {...register('meetingType')} />
      {t(`meetings.type.${value}`)}
    </label>
  );

  return (
    <>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="mx-auto flex w-full max-w-2xl flex-col gap-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(editing ? 'meetingForm.edit.title' : 'meetingForm.create.title')}
        </h1>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

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
              <Field label={t('meetingForm.candidate.position')} htmlFor={`${uid}-position`} error={fieldError('newPosition')}>
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
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => void positions.refetch()}>
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

        <Group title={t('meetingForm.group.schedule')}>
          <Field label={t('meetingForm.field.title')} htmlFor={`${uid}-title`} error={fieldError('title')}>
            <Input
              id={`${uid}-title`}
              aria-invalid={formState.errors.title ? true : undefined}
              aria-describedby={formState.errors.title ? `${uid}-title-error` : undefined}
              {...register('title')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('meetingForm.field.date')} htmlFor={`${uid}-date`} error={fieldError('date')}>
              <Input
                id={`${uid}-date`}
                type="date"
                aria-invalid={formState.errors.date ? true : undefined}
                aria-describedby={formState.errors.date ? `${uid}-date-error` : undefined}
                {...register('date')}
              />
            </Field>
            <Field label={t('meetingForm.field.start')} htmlFor={`${uid}-start`} error={fieldError('startTime')}>
              <Select
                id={`${uid}-start`}
                className="tabular"
                aria-invalid={formState.errors.startTime ? true : undefined}
                aria-describedby={formState.errors.startTime ? `${uid}-start-error` : undefined}
                {...register('startTime')}
              >
                {timeOptions(initial.startTime).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('meetingForm.field.end')} htmlFor={`${uid}-end`} error={fieldError('endTime')}>
              <Select
                id={`${uid}-end`}
                className="tabular"
                aria-invalid={formState.errors.endTime ? true : undefined}
                aria-describedby={formState.errors.endTime ? `${uid}-end-error` : undefined}
                {...register('endTime')}
              >
                <option value="">{t('meetingForm.field.noEnd')}</option>
                {meeting?.endAt && initial.endTime === KEEP_END ? (
                  <option value={KEEP_END}>
                    {t('meetingForm.field.endsLater').replace(
                      '{when}',
                      () => new Date(meeting.endAt!).toLocaleString(intl, { dateStyle: 'medium', timeStyle: 'short' }),
                    )}
                  </option>
                ) : null}
                {timeOptions(initial.endTime === KEEP_END ? '' : initial.endTime).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Group>

        <Group title={t('meetingForm.group.details')}>
          <div role="radiogroup" aria-label={t('meetingForm.field.type')} className="grid gap-2 sm:grid-cols-2">
            {typeCard('ONSITE')}
            {typeCard('ONLINE')}
          </div>
          {meetingType === 'ONLINE' ? (
            <Field label={t('meetingForm.field.provider')} htmlFor={`${uid}-provider`} error={fieldError('provider')}>
              <Select id={`${uid}-provider`} {...register('provider')}>
                <option value="">{t('meetingForm.field.notSet')}</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {t(`meetings.provider.${p}`)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {editing ? (
            <Field label={t('meetingForm.field.status')} htmlFor={`${uid}-status`}>
              <Select id={`${uid}-status`} {...register('status')}>
                {meeting?.status === 'CANCELLED' ? (
                  <option value="CANCELLED" disabled>
                    {t('meetings.status.CANCELLED')}
                  </option>
                ) : null}
                <option value="PENDING">{t('meetings.status.PENDING')}</option>
                <option value="CONFIRMED">{t('meetings.status.CONFIRMED')}</option>
              </Select>
              {meeting?.status === 'CANCELLED' ? <p className="text-xs text-muted-foreground">{t('meetingForm.cancelledNote')}</p> : null}
            </Field>
          ) : null}
          <Field label={t('meetingForm.field.notes')} htmlFor={`${uid}-notes`} error={fieldError('description')}>
            <Textarea
              id={`${uid}-notes`}
              rows={4}
              aria-invalid={formState.errors.description ? true : undefined}
              aria-describedby={formState.errors.description ? `${uid}-notes-error` : undefined}
              {...register('description')}
            />
          </Field>
        </Group>

        <div className="flex justify-end gap-3 border-t border-border pt-6">
          <Button variant="outline" onClick={() => router.push('/')}>
            {t('meetingForm.cancel')}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
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
    </>
  );
}
