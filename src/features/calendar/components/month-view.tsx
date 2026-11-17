'use client';

import { useEffect, useState } from 'react';
import { isPastMeeting } from '@/features/meetings/datetime';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { isSameDay, monthGrid } from '../dates';
import { meetingsOnDay } from '../layout';
import { EventPopover } from './event-popover';
import { useCreateOnClick } from './use-create-on-click';

/** ADR-014: at most 3 events per day, then "+n more" (opens that week). */
const MAX_PER_DAY = 3;

/** A day picked in the month has no time yet: start at 09:00. */
const DAY_START = '09:00';

const DOT = { CONFIRMED: 'bg-success', PENDING: 'bg-warning', CANCELLED: 'bg-muted-foreground' } as const;

export function MonthView({ date, meetings, onShowWeek }: { date: Date; meetings: Meeting[]; onShowWeek: (day: Date) => void }) {
  const { t, intl, locale } = useI18n();
  const days = monthGrid(date);
  const create = useCreateOnClick();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const weekday = new Intl.DateTimeFormat(intl, { weekday: 'short' });
  const time = new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit', hour12: locale === 'en' });
  const fullDate = new Intl.DateTimeFormat(intl, { dateStyle: 'full' });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div aria-hidden className="grid grid-cols-7 border-b border-border">
        {days.slice(0, 7).map((d) => (
          <div key={d.getTime()} className="border-l border-border px-2 py-1.5 text-xs uppercase text-muted-foreground first:border-l-0">
            {weekday.format(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const inMonth = day.getMonth() === date.getMonth();
          const today = now !== null && isSameDay(day, now);
          const list = meetingsOnDay(meetings, day);
          const hidden = list.length - MAX_PER_DAY;
          return (
            <div
              key={day.getTime()}
              {...create(day, DAY_START)}
              className={cn('flex min-h-24 cursor-cell flex-col gap-0.5 border-l border-t border-border p-1.5 [&:nth-child(7n+1)]:border-l-0 [&:nth-child(-n+7)]:border-t-0', !inMonth && 'bg-muted/50')}
            >
              <span
                aria-current={today ? 'date' : undefined}
                className={cn(
                  'tabular flex size-6 items-center justify-center rounded-full text-sm',
                  today ? 'bg-primary font-semibold text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {day.getDate()}
              </span>
              <ul aria-label={fullDate.format(day)} {...create(day, DAY_START)} className="flex min-w-0 flex-1 flex-col gap-0.5">
                {list.slice(0, hidden > 0 ? MAX_PER_DAY : list.length).map((m) => {
                  const name = m.candidate?.name ?? m.title;
                  const start = new Date(m.dueDate);
                  // A meeting still running from the day before shows without its (earlier) start time.
                  const when = isSameDay(start, day) ? time.format(start) : null;
                  return (
                    <li key={m.id}>
                      <EventPopover
                        meeting={m}
                        now={now}
                        label={`${name}, ${when ?? t('calendar.continues')}, ${t(`meetings.status.${m.status}`)}`}
                        className={cn(
                          'flex w-full items-center gap-1.5 truncate rounded-sm px-1 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          m.status === 'CANCELLED' && 'text-muted-foreground line-through',
                          now && isPastMeeting(m, now) && 'opacity-60',
                        )}
                      >
                        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', DOT[m.status])} />
                        <span className="truncate">
                          {when ? <span className="tabular">{when} </span> : null}
                          {name}
                        </span>
                      </EventPopover>
                    </li>
                  );
                })}
              </ul>
              {hidden > 0 ? (
                <button
                  type="button"
                  onClick={() => onShowWeek(day)}
                  className="self-start rounded-sm px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t('calendar.more').replace('{n}', String(hidden))}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
