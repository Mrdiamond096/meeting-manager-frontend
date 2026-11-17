'use client';

import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useI18n } from '@/i18n/i18n-provider';
import { TIME_SLOTS } from '../datetime';
import { KEEP_END, type MeetingFormValues } from '../form';
import type { Meeting } from '../types';
import { Field, Group, useMeetingFieldError } from './meeting-form-fields';

export function MeetingScheduleFields({ initial, meeting }: { initial: MeetingFormValues; meeting?: Meeting }) {
  const { t, intl } = useI18n();
  const uid = useId();
  const { register, formState } = useFormContext<MeetingFormValues>();
  const fieldError = useMeetingFieldError();
  const timeOptions = (current: string) =>
    current && !TIME_SLOTS.includes(current) ? [...TIME_SLOTS, current].sort() : TIME_SLOTS;
  return (
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
                {t('meetingForm.field.endsLater').replace('{when}', () =>
                  new Date(meeting.endAt!).toLocaleString(intl, { dateStyle: 'medium', timeStyle: 'short' }),
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
  );
}
