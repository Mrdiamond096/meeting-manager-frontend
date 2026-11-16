'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/i18n-provider';
import { isApiError } from '@/lib/api';
import { newMeetingHref } from '@/lib/routes';
import { meetingKeys, meetingsApi } from '../api';
import { startOfLocalDay } from '../datetime';
import { MEETING_STATUSES, type ListMeetingsParams, type MeetingStatus } from '../types';
import { MeetingCard } from './meeting-card';

const PAGE_SIZE = 12;
const SKELETON_COUNT = 6;

type StatusFilter = MeetingStatus | 'ALL';
type Scope = 'all' | 'mine';

const toStatus = (v: string | null): StatusFilter => (MEETING_STATUSES.includes(v as MeetingStatus) ? (v as MeetingStatus) : 'ALL');
const toPage = (v: string | null) => (v && /^\d+$/.test(v) && Number(v) >= 1 ? Number(v) : 1);

function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = toStatus(params.get('status'));
  const scope: Scope = params.get('mine') === 'true' ? 'mine' : 'all';
  const page = toPage(params.get('page'));

  function update(next: { status?: StatusFilter; scope?: Scope; page?: number }) {
    const q = new URLSearchParams();
    const s = next.status ?? status;
    const sc = next.scope ?? scope;
    const p = next.page ?? 1; // any filter change goes back to page 1
    if (s !== 'ALL') q.set('status', s);
    if (sc === 'mine') q.set('mine', 'true');
    if (p > 1) q.set('page', String(p));
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }
  return { status, scope, page, update };
}

export function MeetingsDashboard() {
  const { t } = useI18n();
  const { status, scope, page, update } = useDashboardFilters();
  // Fixed per visit so the query key stays stable; "upcoming" = from the start of today (local).
  const [now] = useState(() => new Date());
  const params: ListMeetingsParams = {
    page,
    pageSize: PAGE_SIZE,
    from: startOfLocalDay(now).toISOString(),
    ...(status !== 'ALL' ? { status } : {}),
    ...(scope === 'mine' ? { mine: true } : {}),
  };
  const query = useQuery({
    queryKey: meetingKeys.list(params),
    queryFn: ({ signal }) => meetingsApi.list(params, signal),
    placeholderData: (previous) => previous,
  });
  const data = query.data;
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0 && page > lastPage) update({ page: lastPage });
  }, [data, page, lastPage]);

  const filtered = status !== 'ALL' || scope === 'mine';

  return (
    <section className="flex flex-col gap-6" aria-labelledby="meetings-heading">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="meetings-heading" className="text-2xl font-semibold tracking-tight">
            {t('meetings.title')}
          </h1>
          {data ? (
            <p className="tabular mt-1 text-sm text-muted-foreground">{t('meetings.count').replace('{n}', String(data.total))}</p>
          ) : null}
        </div>
        <Button asChild>
          <Link href={newMeetingHref}>
            <Plus aria-hidden />
            {t('meetings.schedule')}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<StatusFilter>
          label={t('meetings.filter.status')}
          value={status}
          onChange={(value) => update({ status: value })}
          options={[
            { value: 'ALL', label: t('meetings.filter.all') },
            ...MEETING_STATUSES.map((s) => ({ value: s, label: t(`meetings.status.${s}`) })),
          ]}
        />
        <Segmented<Scope>
          label={t('meetings.filter.scope')}
          value={scope}
          onChange={(value) => update({ scope: value })}
          options={[
            { value: 'all', label: t('meetings.filter.everyone') },
            { value: 'mine', label: t('meetings.filter.mine') },
          ]}
        />
      </div>

      {query.isError && !data ? (
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
      ) : query.isPending ? (
        <ul aria-busy className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-40 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      ) : data && data.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <CalendarPlus aria-hidden className="size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t('meetings.empty.title')}</h2>
          <p className="text-sm text-muted-foreground">{filtered ? t('meetings.empty.filtered') : t('meetings.empty.body')}</p>
          <Button asChild variant="outline">
            <Link href={newMeetingHref}>{t('meetings.empty.cta')}</Link>
          </Button>
        </Card>
      ) : data ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((meeting) => (
              <li key={meeting.id} className="[&>*]:h-full">
                <MeetingCard meeting={meeting} now={now} />
              </li>
            ))}
          </ul>
          <nav aria-label={t('meetings.pagination.label')} className="flex flex-wrap items-center justify-between gap-3">
            <p className="tabular text-sm text-muted-foreground">
              {t('meetings.pagination.showing')
                .replace('{from}', String((data.page - 1) * data.pageSize + 1))
                .replace('{to}', String((data.page - 1) * data.pageSize + data.items.length))
                .replace('{total}', String(data.total))}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => update({ page: data.page - 1 })}>
                <ChevronLeft aria-hidden />
                {t('meetings.pagination.prev')}
              </Button>
              <Button variant="outline" size="sm" disabled={data.page >= lastPage} onClick={() => update({ page: data.page + 1 })}>
                {t('meetings.pagination.next')}
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </nav>
        </>
      ) : null}
    </section>
  );
}
