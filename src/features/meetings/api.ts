import { api } from '@/lib/api';
import type {
  CandidateDetail,
  CandidateSummary,
  CreateMeetingBody,
  ListMeetingsParams,
  Meeting,
  Feedback,
  MeetingDetail,
  Page,
  RangeMeetingsParams,
  UpdateMeetingBody,
} from './types';

export const meetingKeys = {
  all: ['meetings'] as const,
  list: (params: ListMeetingsParams) => ['meetings', 'list', params] as const,
  range: (params: RangeMeetingsParams) => ['meetings', 'range', params] as const,
  detail: (id: string) => ['meetings', 'detail', id] as const,
};

export const candidateKeys = {
  detail: (id: string) => ['candidates', 'detail', id] as const,
  search: (q: string) => ['candidates', 'search', q] as const,
  positions: ['candidates', 'positions'] as const,
};

export const meetingsApi = {
  list: (params: ListMeetingsParams, signal?: AbortSignal) =>
    api<Page<Meeting>>('/meetings', { query: { ...params, mine: params.mine || undefined }, signal }),
  range: (params: RangeMeetingsParams, signal?: AbortSignal) =>
    api<{ items: Meeting[] }>('/meetings', { query: { view: 'range', ...params, mine: params.mine || undefined }, signal }).then((r) => r.items),
  get: (id: string, signal?: AbortSignal) => api<MeetingDetail>(`/meetings/${id}`, { signal }),
  create: (body: CreateMeetingBody) => api<Meeting>('/meetings', { method: 'POST', body }),
  update: (id: string, body: UpdateMeetingBody) => api<Meeting>(`/meetings/${id}`, { method: 'PATCH', body }),
  cancel: (id: string, version: number) => api<Meeting>(`/meetings/${id}/cancel`, { method: 'POST', body: { version } }),
  remove: (id: string, version: number) => api<void>(`/meetings/${id}`, { method: 'DELETE', query: { version } }),
  addFeedback: (id: string, body: string) => api<Feedback>(`/meetings/${id}/feedback`, { method: 'POST', body: { body } }),
};

export const candidatesApi = {
  get: (id: string, signal?: AbortSignal) => api<CandidateDetail>(`/candidates/${id}`, { signal }),
  search: (q: string, signal?: AbortSignal) =>
    api<{ items: CandidateSummary[] }>('/candidates', { query: { q }, signal }).then((r) => r.items),
  positions: (signal?: AbortSignal) => api<{ items: string[] }>('/candidates/positions', { signal }).then((r) => r.items),
};
