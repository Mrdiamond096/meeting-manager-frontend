import { api } from '@/lib/api';
import type { ListMeetingsParams, Meeting, Page } from './types';

export const meetingKeys = {
  list: (params: ListMeetingsParams) => ['meetings', 'list', params] as const,
};

export const meetingsApi = {
  list: (params: ListMeetingsParams, signal?: AbortSignal) =>
    api<Page<Meeting>>('/meetings', { query: { ...params, mine: params.mine || undefined }, signal }),
};
