import { Suspense } from 'react';
import { MeetingsDashboard } from '@/features/meetings/components/meetings-dashboard';

export default function DashboardPage() {
  return (
    <Suspense>
      <MeetingsDashboard />
    </Suspense>
  );
}
