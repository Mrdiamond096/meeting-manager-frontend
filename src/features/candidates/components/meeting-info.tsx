'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/features/meetings/components/status-badge';
import { formatTimeRange, isPastMeeting } from '@/features/meetings/datetime';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';

const zoneName = (iso: string, intl: string) =>
  new Intl.DateTimeFormat(intl, { timeZoneName: 'short' }).formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName')?.value;

export function MeetingInfo({ meeting, upcoming, now }: { meeting: Meeting; upcoming: boolean; now: Date }) {
  const { t, intl, locale } = useI18n();
  const zone = zoneName(meeting.dueDate, intl);
  const where = meeting.meetingType
    ? [t(`meetings.type.${meeting.meetingType}`), meeting.meetingType === 'ONLINE' && meeting.provider ? t(`meetings.provider.${meeting.provider}`) : null]
        .filter(Boolean)
        .join(' · ')
    : '—';
  const rows: [string, ReactNode][] = [
    [t('candidate.info.title'), meeting.title],
    [
      t('candidate.info.date'),
      new Intl.DateTimeFormat(intl, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(meeting.dueDate)),
    ],
    [t('candidate.info.time'), `${formatTimeRange(meeting, intl, locale)}${zone ? ` (${zone})` : ''}`],
    [t('candidate.info.type'), where],
    [t('candidate.info.status'), <StatusBadge key="status" status={isPastMeeting(meeting, now) ? 'PAST' : meeting.status} />],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(upcoming ? 'candidate.info.upcoming' : 'candidate.info.meeting')}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
