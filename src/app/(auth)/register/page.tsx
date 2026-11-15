import { Suspense } from 'react';
import { RegisterForm } from '@/features/auth/components/register-form';

export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
