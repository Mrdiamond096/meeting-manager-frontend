'use client';

import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { ActionLink as Link } from '@/components/ui/action-link';
import { useEffect, useState } from 'react';
import { formatTimeRange, isPastMeeting } from '@/features/meetings/datetime';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { calendarReturnHref, newMeetingAt } from '@/lib/routes';
import { isSameDay, toDateParam, weekDays } from '../dates';
import { meetingsOnDay } from '../layout';
import { EventPopover } from './event-popover';

const DAY_START = '09:00';
const DOT = { CONFIRMED: 'bg-success', PENDING: 'bg-warning', CANCELLED: 'bg-muted-foreground' } as const;

/** Phones: the week as a list of days (ADR-014), since seven time columns do not fit. */
export function DayAgenda({ date, meetings }: { date: Date; meetings: Meeting[] }) {
  const { t, intl, locale } = useI18n();
  const returnTo = calendarReturnHref(useSearchParams());
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const heading = new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'short' });
  const fullDate = new Intl.DateTimeFormat(intl, { dateStyle: 'full' });

  return (
    <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {weekDays(date).map((day) => {
        const list = meetingsOnDay(meetings, day);
        const today = now !== null && isSameDay(day, now);
        return (
          <section key={day.getTime()} aria-label={fullDate.format(day)} className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 aria-current={today ? 'date' : undefined} className={cn('text-sm font-semibold', today && 'text-primary')}>
                {heading.format(day)}
              </h3>
              <Link
                href={newMeetingAt(toDateParam(day), DAY_START, returnTo)}
                aria-label={t('calendar.addOn').replace('{day}', fullDate.format(day))}
                className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus aria-hidden className="size-4" />
              </Link>
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('calendar.noMeetings')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {list.map((m) => {
                  const name = m.candidate?.name ?? m.title;
                  const when = isSameDay(new Date(m.dueDate), day) ? formatTimeRange(m, intl, locale) : t('calendar.continues');
                  return (
                    <li key={m.id}>
                      <EventPopover
                        meeting={m}
                        now={now}
                        label={`${name}, ${when}, ${t(`meetings.status.${m.status}`)}`}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          m.status === 'CANCELLED' && 'text-muted-foreground line-through',
                          now && isPastMeeting(m, now) && 'opacity-60',
                        )}
                      >
                        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[m.status])} />
                        <span className="tabular w-28 shrink-0 text-xs text-muted-foreground">{when}</span>
                        <span className="truncate font-medium">{name}</span>
                      </EventPopover>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
