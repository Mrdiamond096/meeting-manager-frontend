import { api } from '@/lib/api';
import type {
  CandidateSummary,
  CreateMeetingBody,
  ListMeetingsParams,
  Meeting,
  Page,
  UpdateMeetingBody,
} from './types';

export const meetingKeys = {
  all: ['meetings'] as const,
  list: (params: ListMeetingsParams) => ['meetings', 'list', params] as const,
  detail: (id: string) => ['meetings', 'detail', id] as const,
};

export const candidateKeys = {
  search: (q: string) => ['candidates', 'search', q] as const,
  positions: ['candidates', 'positions'] as const,
};

export const meetingsApi = {
  list: (params: ListMeetingsParams, signal?: AbortSignal) =>
    api<Page<Meeting>>('/meetings', { query: { ...params, mine: params.mine || undefined }, signal }),
  get: (id: string, signal?: AbortSignal) => api<Meeting>(`/meetings/${id}`, { signal }),
  create: (body: CreateMeetingBody) => api<Meeting>('/meetings', { method: 'POST', body }),
  update: (id: string, body: UpdateMeetingBody) => api<Meeting>(`/meetings/${id}`, { method: 'PATCH', body }),
};

export const candidatesApi = {
  search: (q: string, signal?: AbortSignal) =>
    api<{ items: CandidateSummary[] }>('/candidates', { query: { q }, signal }).then((r) => r.items),
  positions: (signal?: AbortSignal) => api<{ items: string[] }>('/candidates/positions', { signal }).then((r) => r.items),
};
