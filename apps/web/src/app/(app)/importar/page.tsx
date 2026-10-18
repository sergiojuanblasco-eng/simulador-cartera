import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { serverEnv } from '@/lib/env';
import { ImportWizard } from './wizard';

export const metadata: Metadata = { title: 'Importar movimientos' };

export default async function ImportarPage({ searchParams }: { searchParams: Promise<{ cartera?: string }> }) {
  const { cartera } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase.from('portfolios').select('id, nombre').order('orden');
  const portfolios = data ?? [];
  return (
    <ImportWizard
      portfolios={portfolios}
      initialPortfolio={portfolios.find((p) => p.id === cartera)?.id ?? portfolios[0]?.id ?? null}
      aiEnabled={!!serverEnv.anthropicKey()}
    />
  );
}
