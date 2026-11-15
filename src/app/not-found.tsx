import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { getT } from '@/i18n/server';

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="text-xl font-semibold">{t('notFound.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('notFound.body')}</p>
      <Link href="/" className={buttonVariants({ variant: 'outline' })}>
        {t('notFound.back')}
      </Link>
    </div>
  );
}
