import { Suspense } from 'react';
import { ForgotForm } from '@/features/auth/components/forgot-form';

export default function Page() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
