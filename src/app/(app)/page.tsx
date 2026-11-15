import { getT } from '@/i18n/server';

// Placeholder until C2 (dashboard).
export default async function DashboardPage() {
  const t = await getT();
  return (
    <section>
      <h1 className="text-2xl font-semibold">Upcoming Meetings</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('app.title')}</p>
    </section>
  );
}
