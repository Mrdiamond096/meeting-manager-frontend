'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { meetingKeys, meetingsApi } from '@/features/meetings/api';
import type { Meeting, MeetingStatus, RangeMeetingsParams } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { Segmented } from '@/components/ui/segmented';
import { addDays, addMonths, monthGrid, splitDays, startOfMonth, startOfWeek } from '../dates';
import { endOf } from '../layout';
import { MonthView } from './month-view';
import { WeekView } from './week-view';

const overlaps = (m: Meeting, from: Date, to: Date) => new Date(m.dueDate) < to && endOf(m) > from;

/** One request per chunk (see splitDays); a meeting crossing a chunk edge comes back twice and is kept once. */
async function loadRange(params: RangeMeetingsParams, from: Date, to: Date, signal?: AbortSignal): Promise<Meeting[]> {
  const pages = await Promise.all(
    splitDays(from, to).map(([f, t]) => meetingsApi.range({ ...params, from: f.toISOString(), to: t.toISOString() }, signal)),
  );
  const byId = new Map(pages.flat().map((m) => [m.id, m]));
  return [...byId.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}

export type CalendarMode = 'week' | 'month';

interface Props {
  date: Date;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  status?: MeetingStatus;
  mine: boolean;
  onDateChange: (date: Date, mode?: CalendarMode) => void;
  /** "n meetings this week" / "n meetings in November" for the page header. */
  onSummary: (summary: string | undefined) => void;
}

/** Short zone name of the browser (e.g. GMT+7); read after mount so the server render does not guess it. */
function useZoneName(intl: string, at: Date) {
  const [zone, setZone] = useState<string>();
  useEffect(() => {
    setZone(new Intl.DateTimeFormat(intl, { timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value);
  }, [intl, at.getTime()]);
  return zone;
}

/**
 * Rendered only in the browser: weeks, day numbers and labels depend on the browser timezone (ADR-005), which the
 * server (UTC in the container) does not know, and Node and the browser format date ranges with different spaces.
 */
export function MeetingsCalendar(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Calendar {...props} /> : <Skeleton aria-busy className="h-[42rem] w-full rounded-lg" />;
}

function Calendar({ date, mode, status, mine, onDateChange, onModeChange, onSummary }: Props) {
  const { t, intl } = useI18n();
  const month = mode === 'month';
  // Week: Mon–Mon. Month: the 42 days of the 6×7 grid (the API's maximum range).
  const start = month ? monthGrid(date)[0]! : startOfWeek(date);
  const end = addDays(start, month ? 42 : 7);
  const params: RangeMeetingsParams = {
    // The API returns meetings that overlap [from, to), including ones that started before Monday (contract: range view).
    from: start.toISOString(),
    to: end.toISOString(),
    ...(status ? { status } : {}),
    ...(mine ? { mine: true } : {}),
  };
  const query = useQuery({
    queryKey: meetingKeys.range(params),
    queryFn: ({ signal }) => loadRange(params, start, end, signal),
    placeholderData: (previous) => previous,
  });
  const zone = useZoneName(intl, start);
  // Same overlap rule as the API; also keeps a previous range's data from leaking in while the next one loads.
  const meetings = query.data?.filter((m) => overlaps(m, start, end));
  const monthName = new Intl.DateTimeFormat(intl, { month: 'long' }).format(date);
  // The month header counts the meetings of the month itself, not the grid's days from the months around it.
  const count = month
    ? meetings?.filter((m) => overlaps(m, startOfMonth(date), addMonths(date, 1))).length
    : meetings?.length;
  const summary =
    count === undefined ? undefined : month ? t('calendar.countMonth').replace('{n}', String(count)).replace('{month}', monthName) : t('calendar.count').replace('{n}', String(count));
  useEffect(() => onSummary(summary), [summary, onSummary]);

  const label = month
    ? new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' }).format(date)
    : new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(start, addDays(end, -1));
  const step = (n: number) => onDateChange(month ? addMonths(date, n) : addDays(start, 7 * n));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
          {t('calendar.today')}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t(month ? 'calendar.prevMonth' : 'calendar.prevWeek')} onClick={() => step(-1)}>
          <ChevronLeft aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label={t(month ? 'calendar.nextMonth' : 'calendar.nextWeek')} onClick={() => step(1)}>
          <ChevronRight aria-hidden />
        </Button>
        <h2 aria-live="polite" className="tabular text-lg font-semibold">
          {label}
        </h2>
        <Segmented<CalendarMode>
          className="ml-auto"
          label={t('calendar.mode')}
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'week', label: t('calendar.week') },
            { value: 'month', label: t('calendar.month') },
          ]}
        />
      </div>

      {query.isError ? (
        // Also shown above data kept from before a failed refresh, so stale events are never shown silently.
        <Alert tone="error">
          <p className="font-medium">{t('meetings.error.title')}</p>
          {isApiError(query.error) && query.error.requestId ? (
            <p className="mt-0.5 text-xs">
              {t('error.requestId')}: {query.error.requestId}
            </p>
          ) : null}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void query.refetch()}>
            {t('error.retry')}
          </Button>
        </Alert>
      ) : null}
      {meetings ? (
        <div aria-busy={query.isFetching || undefined}>
          {month ? (
            <MonthView date={date} meetings={meetings} onShowWeek={(day) => onDateChange(day, 'week')} />
          ) : (
            <WeekView date={start} meetings={meetings} zone={zone} />
          )}
        </div>
      ) : !query.isError ? (
        <Skeleton aria-busy className="h-[42rem] w-full rounded-lg" />
      ) : null}
    </div>
  );
}
