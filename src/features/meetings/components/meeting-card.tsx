'use client';

import { ArrowRight, CalendarDays, MapPin, Video } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/initials';
import { meetingHref } from '@/lib/routes';
import { formatMeetingWhen, isPastMeeting, isSameLocalDay } from '../datetime';
import type { Meeting } from '../types';
import { StatusBadge } from './status-badge';

export function MeetingCard({ meeting, now }: { meeting: Meeting; now: Date }) {
  const { t, intl, locale } = useI18n();
  const today = meeting.status !== 'CANCELLED' && isSameLocalDay(meeting.dueDate, now);
  const past = isPastMeeting(meeting, now);
  const name = meeting.candidate?.name ?? meeting.title;
  const subtitle = meeting.candidate?.position ?? t('meetings.noCandidate');
  const online = meeting.meetingType === 'ONLINE';
  const TypeIcon = online ? Video : MapPin;
  const where = meeting.meetingType
    ? [t(`meetings.type.${meeting.meetingType}`), online && meeting.provider ? t(`meetings.provider.${meeting.provider}`) : null]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <Card
      className={cn(
        'relative flex flex-col gap-3 p-5 transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring',
        today && 'border-l-[3px] border-l-brand',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
        >
          {meeting.candidate ? initials(name) : <CalendarDays className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{name}</h3>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={past ? 'PAST' : meeting.status} />
          {today ? <span className="text-xs font-medium text-foreground">{t('meetings.today')}</span> : null}
        </div>
      </div>
      <p className="tabular flex items-center gap-2 text-sm">
        <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {formatMeetingWhen(meeting, intl, locale)}
      </p>
      {where ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <TypeIcon aria-hidden className="size-4 shrink-0" />
          {where}
        </p>
      ) : null}
      <Link
        href={meetingHref(meeting)}
        className="mt-auto inline-flex items-center gap-1 self-end text-sm font-medium text-primary after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
      >
        {t('meetings.viewDetails')}
        <span className="sr-only">: {name}</span>
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Card>
  );
}
