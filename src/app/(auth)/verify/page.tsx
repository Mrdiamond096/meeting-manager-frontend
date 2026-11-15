import { Suspense } from 'react';
import { VerifyForm } from '@/features/auth/components/verify-form';

export default function Page() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
