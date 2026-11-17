'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface CurrentUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'RECRUITER' | 'INTERVIEWER';
}

export const currentUserKey = ['auth', 'me'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => api<{ user: CurrentUser }>('/auth/me', { signal }).then((r) => r.user),
    staleTime: 5 * 60_000,
  });
}
