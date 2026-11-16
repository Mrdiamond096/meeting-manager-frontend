'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatTimeRange, isPastMeeting } from '@/features/meetings/datetime';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { meetingHref } from '@/lib/routes';
import { isSameDay, minutesInDay, weekDays } from '../dates';
import { layoutDay } from '../layout';

/** Pixels per hour (h-12 rows); the grid opens at 07:00 with 13 hours in view and scrolls over 00–24 (ADR-014). */
const HOUR = 48;
const FIRST_VISIBLE_HOUR = 7;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const px = (minutes: number) => `${(minutes / 60) * HOUR}px`;

const TONE = {
  CONFIRMED: 'border-success bg-success-subtle',
  PENDING: 'border-warning bg-warning-subtle',
  CANCELLED: 'border-muted-foreground bg-muted text-muted-foreground line-through',
} as const;

/**
 * Positions are set through `element.style` in refs: the nonce CSP blocks `style` attributes in server HTML,
 * while DOM style assignments are allowed. Everything positioned is client-only (data and clock come from the browser).
 */
const place = (styles: Partial<Record<'top' | 'height' | 'left' | 'width', string>>) => (el: HTMLElement | null) => {
  if (el) Object.assign(el.style, styles);
};

export function WeekView({ date, meetings, zone }: { date: Date; meetings: Meeting[]; zone?: string }) {
  const { intl, locale } = useI18n();
  const days = weekDays(date);
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    if (scroller.current) scroller.current.scrollTop = FIRST_VISIBLE_HOUR * HOUR;
    return () => clearInterval(timer);
  }, []);

  const weekday = new Intl.DateTimeFormat(intl, { weekday: 'short' });
  const hour = new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit', hour12: locale === 'en' });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))] border-b border-border">
        <div className="tabular self-end px-1 pb-1 text-[11px] text-muted-foreground">{zone}</div>
        {days.map((day) => {
          const today = now !== null && isSameDay(day, now);
          return (
            <div key={day.getTime()} className="flex flex-col items-center gap-1 border-l border-border py-2">
              <span className={cn('text-xs uppercase', today ? 'text-primary' : 'text-muted-foreground')}>{weekday.format(day)}</span>
              <span
                aria-current={today ? 'date' : undefined}
                className={cn('tabular flex size-7 items-center justify-center rounded-full text-sm font-medium', today && 'bg-primary text-primary-foreground')}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div ref={scroller} className="max-h-[39rem] overflow-y-auto">
        <div className="grid grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]">
          <div aria-hidden>
            {HOURS.map((h) => (
              <div key={h} className="tabular relative h-12">
                {h > 0 ? (
                  <span className="absolute -top-2 right-2 whitespace-nowrap text-[11px] text-muted-foreground">{hour.format(new Date(2000, 0, 1, h))}</span>
                ) : null}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn key={day.getTime()} day={day} meetings={meetings} now={now} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day, meetings, now }: { day: Date; meetings: Meeting[]; now: Date | null }) {
  const { t, intl, locale } = useI18n();
  const placed = layoutDay(meetings, day);
  return (
    <div className="relative border-l border-border">
      {HOURS.map((h) => (
        <div key={h} aria-hidden className="h-12 border-b border-border/60" />
      ))}
      <ol aria-label={new Intl.DateTimeFormat(intl, { dateStyle: 'full' }).format(day)} className="absolute inset-0">
        {placed.map(({ meeting, top, height, column, columns }) => {
          const name = meeting.candidate?.name ?? meeting.title;
          const when = formatTimeRange(meeting, intl, locale);
          return (
            <li
              key={meeting.id}
              className="absolute p-0.5"
              ref={place({ top: px(top), height: px(height), left: `${(column / columns) * 100}%`, width: `${100 / columns}%` })}
            >
              <Link
                href={meetingHref(meeting)}
                aria-label={`${name}, ${when}, ${t(`meetings.status.${meeting.status}`)}`}
                className={cn(
                  'flex h-full flex-col overflow-hidden rounded-sm border-l-[3px] px-1.5 py-0.5 text-xs hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  TONE[meeting.status],
                  now && isPastMeeting(meeting, now) && 'opacity-60',
                )}
              >
                <span className="truncate font-medium">{name}</span>
                <span className="tabular truncate text-[11px] text-muted-foreground">{when}</span>
              </Link>
            </li>
          );
        })}
        {now && isSameDay(day, now) ? (
          <li aria-hidden className="pointer-events-none absolute inset-x-0 border-t-2 border-destructive" ref={place({ top: px(minutesInDay(now, day)) })}>
            <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-destructive" />
          </li>
        ) : null}
      </ol>
    </div>
  );
}
