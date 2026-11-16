'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { meetingKeys, meetingsApi } from '@/features/meetings/api';
import type { MeetingStatus, RangeMeetingsParams } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { addDays, startOfWeek } from '../dates';
import { WeekView } from './week-view';

interface Props {
  date: Date;
  status?: MeetingStatus;
  mine: boolean;
  onDateChange: (date: Date) => void;
  onCount: (count: number | undefined) => void;
}

/** Short zone name of the browser (e.g. GMT+7); read after mount so the server render does not guess it. */
function useZoneName(intl: string, at: Date) {
  const [zone, setZone] = useState<string>();
  useEffect(() => {
    setZone(new Intl.DateTimeFormat(intl, { timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value);
  }, [intl, at]);
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

function Calendar({ date, status, mine, onDateChange, onCount }: Props) {
  const { t, intl } = useI18n();
  const start = startOfWeek(date);
  const end = addDays(start, 7);
  const params: RangeMeetingsParams = {
    from: start.toISOString(),
    to: end.toISOString(),
    ...(status ? { status } : {}),
    ...(mine ? { mine: true } : {}),
  };
  const query = useQuery({
    queryKey: meetingKeys.range(params),
    queryFn: ({ signal }) => meetingsApi.range(params, signal),
    placeholderData: (previous) => previous,
  });
  const zone = useZoneName(intl, start);
  const count = query.data?.length;
  useEffect(() => onCount(count), [count, onCount]);

  const label = new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', year: 'numeric' }).formatRange(start, addDays(end, -1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
          {t('calendar.today')}
        </Button>
        <Button variant="ghost" size="icon" aria-label={t('calendar.prevWeek')} onClick={() => onDateChange(addDays(start, -7))}>
          <ChevronLeft aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" aria-label={t('calendar.nextWeek')} onClick={() => onDateChange(addDays(start, 7))}>
          <ChevronRight aria-hidden />
        </Button>
        <h2 aria-live="polite" className="tabular text-lg font-semibold">
          {label}
        </h2>
      </div>

      {query.isError && !query.data ? (
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
      ) : query.data ? (
        <div aria-busy={query.isFetching || undefined}>
          <WeekView date={start} meetings={query.data} zone={zone} />
        </div>
      ) : (
        <Skeleton aria-busy className="h-[42rem] w-full rounded-lg" />
      )}
    </div>
  );
}
