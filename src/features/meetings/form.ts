import { z } from 'zod';
import type { ApiErrorDetail } from '@/lib/api';
import { fromLocalParts, toLocalParts } from './datetime';
import type { CandidateSummary, CreateMeetingBody, Meeting, MeetingStatus, UpdateMeetingBody } from './types';

export type CandidateMode = 'none' | 'existing' | 'new';

/** An end on another day cannot be picked with one date field, so an existing one is kept as its own choice. */
export const KEEP_END = 'keep';

export interface MeetingFormValues {
  candidateMode: CandidateMode;
  candidate: CandidateSummary | null;
  newName: string;
  newPosition: string;
  title: string;
  date: string;
  startTime: string;
  /** Empty string = no end time; `KEEP_END` = an existing end on another day. */
  endTime: string;
  meetingType: '' | 'ONSITE' | 'ONLINE';
  provider: '' | 'ZOOM' | 'GOOGLE_MEET' | 'OTHER';
  description: string;
  status: MeetingStatus;
}

/** Messages are i18n keys (resolved by the form), like the auth schemas. */
export const meetingFormSchema = z
  .object({
    candidateMode: z.enum(['none', 'existing', 'new']),
    candidate: z.custom<CandidateSummary | null>(),
    newName: z.string(),
    newPosition: z.string(),
    title: z.string().trim().min(1, 'meetings.validation.titleRequired').max(150, 'meetings.validation.titleMax'),
    date: z.string().min(1, 'meetings.validation.dateRequired'),
    startTime: z.string().min(1, 'meetings.validation.startRequired'),
    endTime: z.string(),
    meetingType: z.enum(['', 'ONSITE', 'ONLINE']),
    provider: z.enum(['', 'ZOOM', 'GOOGLE_MEET', 'OTHER']),
    description: z.string().trim().max(5000, 'meetings.validation.notesMax'),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
  })
  .superRefine((v, ctx) => {
    if (v.candidateMode === 'existing' && !v.candidate) {
      ctx.addIssue({ code: 'custom', path: ['candidate'], message: 'meetings.validation.candidateRequired' });
    }
    if (v.candidateMode === 'new') {
      const name = v.newName.trim();
      if (!name) ctx.addIssue({ code: 'custom', path: ['newName'], message: 'meetings.validation.nameRequired' });
      else if (name.length > 120) ctx.addIssue({ code: 'custom', path: ['newName'], message: 'meetings.validation.nameMax' });
      if (!v.newPosition) ctx.addIssue({ code: 'custom', path: ['newPosition'], message: 'meetings.validation.positionRequired' });
    }
    if (v.endTime && v.endTime !== KEEP_END && v.startTime && v.endTime <= v.startTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'meetings.validation.endAfterStart' });
    }
  });

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A start from the URL (`?date=YYYY-MM-DD&start=HH:mm`), or undefined when either part is missing or not a real day. */
export function parseStartParams(date: unknown, time: unknown): { date: string; time: string } | undefined {
  if (typeof date !== 'string' || typeof time !== 'string' || !TIME.test(time)) return undefined;
  const m = DATE.exec(date);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? { date, time } : undefined;
}

/** `at` is a start picked in the calendar; without it the form starts at the next quarter hour. */
export function emptyFormValues(now: Date, at?: { date: string; time: string }): MeetingFormValues {
  const start = at ? new Date(fromLocalParts(at.date, at.time)) : new Date(now);
  if (!at) start.setMinutes(Math.ceil((start.getMinutes() + 1) / 15) * 15, 0, 0);
  const end = new Date(start.getTime() + 60 * 60_000);
  const s = toLocalParts(start.toISOString());
  const e = toLocalParts(end.toISOString());
  return {
    candidateMode: 'none',
    candidate: null,
    newName: '',
    newPosition: '',
    title: '',
    date: s.date,
    startTime: s.time,
    // Crossing midnight cannot be expressed with one date, so leave the end open.
    endTime: e.date === s.date ? e.time : '',
    meetingType: 'ONSITE',
    provider: '',
    description: '',
    status: 'PENDING',
  };
}

export function meetingToFormValues(m: Meeting): MeetingFormValues {
  const start = toLocalParts(m.dueDate);
  const end = m.endAt ? toLocalParts(m.endAt) : null;
  return {
    candidateMode: m.candidate ? 'existing' : 'none',
    candidate: m.candidate,
    newName: '',
    newPosition: '',
    title: m.title,
    date: start.date,
    startTime: start.time,
    endTime: !end ? '' : end.date === start.date ? end.time : KEEP_END,
    meetingType: m.meetingType ?? '',
    provider: m.provider ?? '',
    description: m.description,
    status: m.status,
  };
}

const instants = (v: MeetingFormValues) => ({
  dueDate: fromLocalParts(v.date, v.startTime),
  endAt: v.endTime ? fromLocalParts(v.date, v.endTime) : undefined,
});

export function toCreateBody(v: MeetingFormValues): CreateMeetingBody {
  const { dueDate, endAt } = instants(v);
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    dueDate,
    ...(endAt ? { endAt } : {}),
    status: v.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
    ...(v.meetingType ? { meetingType: v.meetingType } : {}),
    ...(v.meetingType === 'ONLINE' && v.provider ? { provider: v.provider } : {}),
    ...(v.candidateMode === 'existing' && v.candidate ? { candidateId: v.candidate.id } : {}),
    ...(v.candidateMode === 'new' ? { candidate: { name: v.newName.trim(), position: v.newPosition } } : {}),
  };
}

/** `undefined` = leave the end as it is. */
function nextEndAt(original: Meeting, initial: MeetingFormValues, v: MeetingFormValues, dueDate: string): string | null | undefined {
  if (v.endTime !== initial.endTime) return v.endTime ? fromLocalParts(v.date, v.endTime) : null;
  if (v.date === initial.date) return undefined;
  if (v.endTime === KEEP_END) {
    // Moving the date keeps the end on another day at the same distance from the start.
    return new Date(Date.parse(original.endAt!) + Date.parse(dueDate) - Date.parse(original.dueDate)).toISOString();
  }
  return v.endTime ? fromLocalParts(v.date, v.endTime) : undefined;
}

/**
 * Sends only what changed. Date/time fields the user did not touch keep the original instants, so a meeting whose
 * end falls on another day (not editable with one date field) is never rewritten by accident.
 */
export function toUpdateBody(original: Meeting, initial: MeetingFormValues, v: MeetingFormValues): UpdateMeetingBody | null {
  const body: UpdateMeetingBody = { version: original.version };
  if (v.title.trim() !== original.title) body.title = v.title.trim();
  if (v.description.trim() !== original.description) body.description = v.description.trim();

  const dueDate = fromLocalParts(v.date, v.startTime);
  if (v.date !== initial.date || v.startTime !== initial.startTime) body.dueDate = dueDate;
  const endAt = nextEndAt(original, initial, v, dueDate);
  if (endAt !== undefined) body.endAt = endAt;

  const type = v.meetingType || null;
  const provider = type === 'ONLINE' ? v.provider || null : null;
  if (type !== original.meetingType) body.meetingType = type;
  if (provider !== original.provider) body.provider = provider;

  if (v.status !== original.status && v.status !== 'CANCELLED') body.status = v.status;

  if (v.candidateMode === 'new') {
    body.candidate = { name: v.newName.trim(), position: v.newPosition };
  } else {
    const candidateId = v.candidateMode === 'existing' ? (v.candidate?.id ?? null) : null;
    if (candidateId !== (original.candidate?.id ?? null)) body.candidateId = candidateId;
  }

  return Object.keys(body).length > 1 ? body : null;
}

const FIELD_BY_PATH: Record<string, keyof MeetingFormValues> = {
  title: 'title',
  description: 'description',
  dueDate: 'date',
  endAt: 'endTime',
  provider: 'provider',
  meetingType: 'meetingType',
  candidateId: 'candidate',
  'candidate.name': 'newName',
  'candidate.position': 'newPosition',
};

/** Maps API validation details (`body.dueDate`) back to form fields; unknown paths are returned for a form-level alert. */
export function mapApiErrors(details: ApiErrorDetail[] = []) {
  const fields: Partial<Record<keyof MeetingFormValues, string>> = {};
  const unmapped: string[] = [];
  for (const d of details) {
    const field = FIELD_BY_PATH[d.path.replace(/^body\./, '')];
    if (field) fields[field] ??= d.message;
    else unmapped.push(d.message);
  }
  return { fields, unmapped };
}
