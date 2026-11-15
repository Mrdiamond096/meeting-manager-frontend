import { Suspense } from 'react';
import { ResetForm } from '@/features/auth/components/reset-form';

export default function Page() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
