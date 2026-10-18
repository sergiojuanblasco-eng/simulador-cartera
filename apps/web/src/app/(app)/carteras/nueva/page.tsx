import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { NewPortfolioWizard } from './wizard';

export const metadata: Metadata = { title: 'Nueva cartera' };

export default async function NuevaCarteraPage({ searchParams }: { searchParams: Promise<{ primera?: string }> }) {
  const { primera } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase.from('portfolios').select('nombre');
  return <NewPortfolioWizard primera={primera === '1' || (data?.length ?? 0) === 0} existentes={(data ?? []).map((p) => p.nombre)} />;
}
