/** Shapes from backend/docs/api-contract.md §2 (source of truth). */

export type MeetingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type MeetingType = 'ONSITE' | 'ONLINE';
export type Provider = 'ZOOM' | 'GOOGLE_MEET' | 'OTHER';

export const MEETING_STATUSES: readonly MeetingStatus[] = ['CONFIRMED', 'PENDING', 'CANCELLED'];
export const PROVIDERS: readonly Provider[] = ['ZOOM', 'GOOGLE_MEET', 'OTHER'];

export interface CandidateSummary {
  id: string;
  name: string;
  position: string;
  createdAt: string;
}

export interface AssignedInterviewer {
  id: string;
  email: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  endAt: string | null;
  status: MeetingStatus;
  meetingType: MeetingType | null;
  provider: Provider | null;
  candidate: CandidateSummary | null;
  interviewers: AssignedInterviewer[];
  createdById: string | null;
  isMine: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Feedback {
  id: string;
  meetingId: string;
  body: string;
  createdById: string | null;
  createdAt: string;
}

/** GET /meetings/:id: the meeting with its feedback, newest first. */
export type MeetingDetail = Meeting & { feedback: Feedback[] };

/** GET /candidates/:id: upcoming ascending, history (everything else) descending. */
export interface CandidateDetail {
  candidate: CandidateSummary;
  upcoming: Meeting[];
  history: Meeting[];
}

/** `GET /meetings?view=range` (calendar, ADR-014): `to - from` ≤ 42 days, no pagination. */
export interface RangeMeetingsParams {
  from: string;
  to: string;
  status?: MeetingStatus;
  mine?: boolean;
  assignedToMe?: boolean;
}

export interface ListMeetingsParams {
  page: number;
  pageSize: number;
  status?: MeetingStatus;
  from?: string;
  mine?: boolean;
  assignedToMe?: boolean;
}

/** POST /meetings body. Candidate: an existing id, or a new one created in the same transaction, or neither. */
export interface CreateMeetingBody {
  interviewerIds?: string[];
  title: string;
  description: string;
  dueDate: string;
  endAt?: string;
  status: Exclude<MeetingStatus, 'CANCELLED'>;
  meetingType?: MeetingType;
  provider?: Provider;
  candidateId?: string;
  candidate?: { name: string; position: string };
}

/** PATCH /meetings/:id body: any subset plus the required `version`. */
export interface UpdateMeetingBody {
  interviewerIds?: string[];
  version: number;
  title?: string;
  description?: string;
  dueDate?: string;
  endAt?: string | null;
  status?: Exclude<MeetingStatus, 'CANCELLED'>;
  meetingType?: MeetingType | null;
  provider?: Provider | null;
  candidateId?: string | null;
  /** Created and linked in the same transaction; never sent together with `candidateId`. */
  candidate?: { name: string; position: string };
}
