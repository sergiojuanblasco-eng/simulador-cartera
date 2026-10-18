import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loadWizardData } from '@/lib/wizard-data';
import { MovementWizard } from './wizard';

export const metadata: Metadata = { title: 'Nuevo movimiento' };

export default async function MovementPage({ params, searchParams }: {
  params: Promise<{ tipo: string }>;
  searchParams: Promise<{ cartera?: string }>;
}) {
  const { tipo } = await params;
  const { cartera } = await searchParams;
  if (tipo !== 'aportacion' && tipo !== 'retirada') notFound();
  const data = await loadWizardData();
  if (data.portfolios.length === 0) redirect('/carteras/nueva?primera=1');
  const initial = data.portfolios.find((p) => p.id === cartera)?.id ?? null;
  return <MovementWizard tipo={tipo} data={data} initialPortfolio={initial} />;
}
