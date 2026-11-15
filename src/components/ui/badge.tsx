import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const badgeVariants = cva('inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium', {
  variants: {
    status: {
      CONFIRMED: 'bg-success-subtle text-success',
      PENDING: 'bg-warning-subtle text-warning',
      CANCELLED: 'bg-destructive-subtle text-destructive',
      PAST: 'bg-muted text-muted-foreground',
      neutral: 'bg-secondary text-secondary-foreground',
    },
  },
  defaultVariants: { status: 'neutral' },
});

export function Badge({ className, status, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ status }), className)} {...props} />;
}
