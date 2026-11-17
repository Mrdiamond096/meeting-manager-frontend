import { EditMeeting } from '@/features/meetings/components/edit-meeting';
import { RequireScheduler } from '@/features/meetings/components/require-scheduler';

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireScheduler>
      <EditMeeting id={id} />
    </RequireScheduler>
  );
}
