import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/**
 * Native select: keyboard and mobile pickers for free, styled with the same tokens as Input. The browser's own arrow
 * sits flush against the border and can't be padded, so it is hidden and drawn here instead.
 */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-card pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive',
          className,
        )}
        {...props}
      />
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
