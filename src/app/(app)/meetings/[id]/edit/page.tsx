import { EditMeeting } from '@/features/meetings/components/edit-meeting';
import { MeetingReadOnly } from '@/features/meetings/components/meeting-read-only';
import { RequireScheduler } from '@/features/meetings/components/require-scheduler';

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireScheduler readOnly={<MeetingReadOnly id={id} />}>
      <EditMeeting id={id} />
    </RequireScheduler>
  );
}
