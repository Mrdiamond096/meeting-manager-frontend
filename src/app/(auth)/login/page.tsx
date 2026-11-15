import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/login-form';

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
