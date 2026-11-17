'use client';

import { useCurrentUser, type CurrentUser } from '@/components/shell/use-current-user';

export type UserRole = CurrentUser['role'];

/** ADR-015, mirrored from the API: the UI only hides actions; the API enforces them. */
export const canSchedule = (role: UserRole | undefined) => role === 'ADMIN' || role === 'RECRUITER';
export const canDeleteMeeting = (
  user: Pick<CurrentUser, 'id' | 'role'> | undefined,
  meeting: { createdById: string | null },
) => user?.role === 'ADMIN' || (user?.role === 'RECRUITER' && meeting.createdById === user.id);

/** Until /auth/me answers nothing is offered, so an interviewer never sees a button flash in. */
export function usePermissions() {
  const { data: user } = useCurrentUser();
  return {
    user,
    canSchedule: canSchedule(user?.role),
    canDelete: (meeting: { createdById: string | null }) => canDeleteMeeting(user, meeting),
  };
}
