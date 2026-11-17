'use client';

import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import type { MeetingFormValues } from '../form';
import { PROVIDERS, type Meeting } from '../types';
import { Field, Group, useMeetingFieldError } from './meeting-form-fields';

export function MeetingDetailsFields({ meeting }: { meeting?: Meeting }) {
  const { t } = useI18n();
  const uid = useId();
  const { register, watch, formState } = useFormContext<MeetingFormValues>();
  const fieldError = useMeetingFieldError();
  const editing = Boolean(meeting);
  const meetingType = watch('meetingType');
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
          {meeting?.status === 'CANCELLED' ? (
            <p className="text-xs text-muted-foreground">{t('meetingForm.cancelledNote')}</p>
          ) : null}
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
  );
}
