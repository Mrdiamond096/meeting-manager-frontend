/** Shapes from backend/docs/api-contract.md §2 (source of truth). */

export type MeetingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type MeetingType = 'ONSITE' | 'ONLINE';
export type Provider = 'ZOOM' | 'GOOGLE_MEET' | 'OTHER';

export const MEETING_STATUSES: readonly MeetingStatus[] = ['CONFIRMED', 'PENDING', 'CANCELLED'];

export interface CandidateSummary {
  id: string;
  name: string;
  position: string;
  createdAt: string;
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

export interface ListMeetingsParams {
  page: number;
  pageSize: number;
  status?: MeetingStatus;
  from?: string;
  mine?: boolean;
}
