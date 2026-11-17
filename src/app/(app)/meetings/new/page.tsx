import { MeetingForm } from '@/features/meetings/components/meeting-form';
import { RequireScheduler } from '@/features/meetings/components/require-scheduler';
import { parseStartParams } from '@/features/meetings/form';
import { meetingCancelHref } from '@/lib/routes';

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { date, start, returnTo } = await searchParams;
  return (
    <RequireScheduler>
      <MeetingForm startAt={parseStartParams(date, start)} cancelHref={meetingCancelHref(returnTo)} />
    </RequireScheduler>
  );
}
