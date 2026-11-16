import { EditMeeting } from '@/features/meetings/components/edit-meeting';

export default async function EditMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditMeeting id={id} />;
}
