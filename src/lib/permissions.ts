'use client';

import type { Meeting } from '@/features/meetings/types';
import { useCurrentUser, type CurrentUser } from '@/components/shell/use-current-user';

export type UserRole = CurrentUser['role'];

/** ADR-015/016, mirrored from the API: the UI only hides actions; the API enforces them. */
export const canSchedule = (role: UserRole | undefined) => role === 'ADMIN' || role === 'RECRUITER';
export const canManageMeeting = (
  user: Pick<CurrentUser, 'id' | 'role'> | undefined,
  meeting: Pick<Meeting, 'interviewers'>,
) =>
  Boolean(
    user &&
      (canSchedule(user.role) ||
        (user.role === 'INTERVIEWER' && (meeting.interviewers ?? []).some((person) => person.id === user.id))),
  );

export const canDeleteMeeting = (
  user: Pick<CurrentUser, 'id' | 'role'> | undefined,
  meeting: { createdById: string | null },
) => user?.role === 'ADMIN' || (user?.role === 'RECRUITER' && meeting.createdById === user.id);

/** Until /auth/me answers nothing is offered, so an interviewer never sees a button flash in. */
export function usePermissions() {
  const userQuery = useCurrentUser();
  const user = userQuery.data;
  return {
    user,
    userQuery,
    canEdit: (meeting: Pick<Meeting, 'interviewers'>) => canManageMeeting(user, meeting),
    canSchedule: canSchedule(user?.role),
    canDelete: (meeting: { createdById: string | null }) => canDeleteMeeting(user, meeting),
  };
}
