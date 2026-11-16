import { cva, type VariantProps } from 'class-variance-authority';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const alertVariants = cva('flex items-start gap-2 rounded-md px-3 py-2.5 text-sm', {
  variants: {
    tone: {
      error: 'bg-destructive-subtle text-destructive',
      info: 'bg-info-subtle text-info',
      success: 'bg-success-subtle text-success',
    },
  },
  defaultVariants: { tone: 'info' },
});

const ICON = { error: CircleAlert, info: Info, success: CircleCheck } as const;

export function Alert({ tone = 'info', className, children, ...props }: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  const Icon = ICON[tone ?? 'info'];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
