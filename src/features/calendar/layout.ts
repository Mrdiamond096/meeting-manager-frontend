import type { Meeting } from '@/features/meetings/types';
import { addDays, minutesInDay } from './dates';

/** Display meetings without an end as 30 minutes, matching the API's range-overlap rule. */
export const DEFAULT_MINUTES = 30;
/** Short events still need room for their name. */
const MIN_MINUTES = 20;

export interface PlacedEvent {
  meeting: Meeting;
  /** Minutes from local midnight. */
  top: number;
  height: number;
  /** Side-by-side slot among overlapping events (ADR-014: split the width). */
  column: number;
  columns: number;
}

export const endOf = (m: Meeting) =>
  m.endAt ? new Date(m.endAt) : new Date(new Date(m.dueDate).getTime() + DEFAULT_MINUTES * 60_000);

/** Events of one local day, positioned in minutes; overlapping events share the width in columns. */
export function layoutDay(meetings: Meeting[], day: Date): PlacedEvent[] {
  const next = addDays(day, 1);
  const events = meetings
    .filter((m) => new Date(m.dueDate) < next && endOf(m) > day)
    .map((m) => {
      const top = minutesInDay(new Date(m.dueDate), day);
      const bottom = minutesInDay(endOf(m), day);
      return { meeting: m, top, bottom: Math.max(bottom, top + MIN_MINUTES) };
    })
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);

  const placed: PlacedEvent[] = [];
  // Clusters of transitively overlapping events share one column count.
  let cluster: (PlacedEvent & { bottom: number })[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const columns = Math.max(0, ...cluster.map((e) => e.column)) + 1;
    for (const { bottom: _bottom, ...e } of cluster) placed.push({ ...e, columns });
    cluster = [];
  };

  for (const e of events) {
    if (e.top >= clusterEnd) flush();
    const taken = new Set(cluster.filter((c) => c.bottom > e.top).map((c) => c.column));
    let column = 0;
    while (taken.has(column)) column++;
    cluster.push({ meeting: e.meeting, top: e.top, height: e.bottom - e.top, bottom: e.bottom, column, columns: 1 });
    clusterEnd = Math.max(clusterEnd, e.bottom);
  }
  flush();
  return placed;
}

/** Meetings that overlap the local day, by start time (month cells list them as "time · name"). */
export const meetingsOnDay = (meetings: Meeting[], day: Date) =>
  meetings
    .filter((m) => new Date(m.dueDate) < addDays(day, 1) && endOf(m) > day)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
