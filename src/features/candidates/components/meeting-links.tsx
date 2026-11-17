'use client';

import { ActionLink as Link } from '@/components/ui/action-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/features/meetings/components/status-badge';
import { isPastMeeting } from '@/features/meetings/datetime';
import type { Meeting } from '@/features/meetings/types';
import { useI18n } from '@/i18n/i18n-provider';
import { cn } from '@/lib/cn';
import { candidateHref } from '@/lib/routes';

interface MeetingLinksProps {
  title: string;
  meetings: Meeting[];
  emptyText?: string;
  candidateId: string;
  focusedId: string | undefined;
  now: Date;
}

/** A list of one candidate's meetings; each opens the summary focused on that meeting. */
export function MeetingLinks({ title, meetings, emptyText, candidateId, focusedId, now }: MeetingLinksProps) {
  const { intl } = useI18n();
  const date = new Intl.DateTimeFormat(intl, { dateStyle: 'medium' });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={candidateHref(candidateId, m.id)}
                  aria-current={m.id === focusedId ? 'true' : undefined}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    m.id === focusedId && 'bg-accent',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{m.title}</span>
                    <span className="tabular text-xs text-muted-foreground">{date.format(new Date(m.dueDate))}</span>
                  </span>
                  <StatusBadge status={isPastMeeting(m, now) ? 'PAST' : m.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
