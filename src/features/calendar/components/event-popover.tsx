'use client';

import { ActionLink as Link } from '@/components/ui/action-link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/features/meetings/components/status-badge';
import { formatMeetingWhen, isPastMeeting } from '@/features/meetings/datetime';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { editMeetingHref, meetingHref } from '@/lib/routes';

/** Event trigger and detail popover. Candidate-less meetings link to the edit form. */
export function EventPopover({ meeting, now, label, className, children }: { meeting: Meeting; now: Date | null; label: string; className: string; children: ReactNode }) {
  const { t, intl, locale } = useI18n();
  const where = meeting.meetingType
    ? [t(`meetings.type.${meeting.meetingType}`), meeting.meetingType === 'ONLINE' && meeting.provider ? t(`meetings.provider.${meeting.provider}`) : null]
        .filter(Boolean)
        .join(' · ')
    : null;
  return (
    <Popover>
      <PopoverTrigger aria-label={label} className={className}>
        {children}
      </PopoverTrigger>
      <PopoverContent aria-label={meeting.candidate?.name ?? meeting.title} className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{meeting.candidate?.name ?? meeting.title}</p>
            {meeting.candidate ? <p className="truncate text-sm text-muted-foreground">{meeting.title}</p> : null}
          </div>
          <StatusBadge status={now && isPastMeeting(meeting, now) ? 'PAST' : meeting.status} />
        </div>
        <dl className="flex flex-col gap-1 text-sm">
          <dt className="sr-only">{t('candidate.info.time')}</dt>
          <dd className="tabular">{formatMeetingWhen(meeting, intl, locale)}</dd>
          {where ? (
            <>
              <dt className="sr-only">{t('candidate.info.type')}</dt>
              <dd className="text-muted-foreground">{where}</dd>
            </>
          ) : null}
        </dl>
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={editMeetingHref(meeting.id)}>{t('candidate.edit')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={meetingHref(meeting)}>{t('calendar.viewDetails')}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
