import { Suspense } from 'react';
import { CandidateSummary } from '@/features/candidates/components/candidate-summary';

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <CandidateSummary id={id} />
    </Suspense>
  );
}
