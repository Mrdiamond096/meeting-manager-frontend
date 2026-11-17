'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function useActionNavigation() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  return {
    isNavigating,
    push: (...args: Parameters<typeof router.push>) => startTransition(() => router.push(...args)),
    replace: (...args: Parameters<typeof router.replace>) => startTransition(() => router.replace(...args)),
    refresh: () => startTransition(() => router.refresh()),
  };
}
