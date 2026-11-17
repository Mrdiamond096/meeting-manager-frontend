import { MeetingForm } from '@/features/meetings/components/meeting-form';
import { parseStartParams } from '@/features/meetings/form';

export default async function NewMeetingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { date, start } = await searchParams;
  return <MeetingForm startAt={parseStartParams(date, start)} />;
}
