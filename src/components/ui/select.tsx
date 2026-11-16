import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** Native select: keyboard and mobile pickers for free, styled with the same tokens as Input. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive',
        className,
      )}
      {...props}
    />
  );
}
