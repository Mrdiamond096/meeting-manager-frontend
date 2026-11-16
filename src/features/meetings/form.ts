import { z } from 'zod';
import type { ApiErrorDetail } from '@/lib/api';
import { fromLocalParts, toLocalParts } from './datetime';
import type { CandidateSummary, CreateMeetingBody, Meeting, MeetingStatus, UpdateMeetingBody } from './types';

export type CandidateMode = 'none' | 'existing' | 'new';

export interface MeetingFormValues {
  candidateMode: CandidateMode;
  candidate: CandidateSummary | null;
  newName: string;
  newPosition: string;
  title: string;
  date: string;
  startTime: string;
  /** Empty string = no end time. */
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
    if (v.endTime && v.startTime && v.endTime <= v.startTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'meetings.validation.endAfterStart' });
    }
  });

export function emptyFormValues(now: Date): MeetingFormValues {
  const start = new Date(now);
  start.setMinutes(Math.ceil((start.getMinutes() + 1) / 15) * 15, 0, 0);
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
    endTime: end && end.date === start.date ? end.time : '',
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
  if (v.endTime) return fromLocalParts(v.date, v.endTime);
  // An end on another day cannot be edited with one date field, so moving the date keeps the end at the same distance from the start.
  return original.endAt ? new Date(Date.parse(original.endAt) + Date.parse(dueDate) - Date.parse(original.dueDate)).toISOString() : undefined;
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
