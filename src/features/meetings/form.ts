import { z } from 'zod';
import type { ApiErrorDetail } from '@/lib/api';
import { fromLocalParts, toLocalParts } from './datetime';
import type { CandidateSummary, CreateMeetingBody, MeetingStatus } from './types';

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
