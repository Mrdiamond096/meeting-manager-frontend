import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/shell/brand-logo';
import { Card } from '@/components/ui/card';

export function AuthCard({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-6 shadow-md">
      <BrandLogo />
      <h1 className="mt-4 text-2xl font-semibold leading-tight">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </Card>
  );
}
