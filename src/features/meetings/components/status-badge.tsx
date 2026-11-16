'use client';

import { CircleCheck, CircleX, Clock, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/i18n-provider';
import type { MeetingStatus } from '../types';

const ICON = { CONFIRMED: CircleCheck, PENDING: Clock, CANCELLED: CircleX, PAST: History } as const;

/** Status is always icon + text, never colour alone (design §1.3). `PAST` is derived, not an API status. */
export function StatusBadge({ status }: { status: MeetingStatus | 'PAST' }) {
  const { t } = useI18n();
  const Icon = ICON[status];
  return (
    <Badge status={status}>
      <Icon aria-hidden className="size-3.5" />
      {t(`meetings.status.${status}`)}
    </Badge>
  );
}
