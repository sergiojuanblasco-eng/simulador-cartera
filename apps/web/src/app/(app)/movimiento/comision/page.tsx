import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { loadWizardData } from '@/lib/wizard-data';
import { FeeForm } from './form';

export const metadata: Metadata = { title: 'Registrar una comisión' };

export default async function ComisionPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const data = await loadWizardData();
  if (data.portfolios.length === 0) redirect('/carteras/nueva?primera=1');
  const grupos = data.portfolios
    .map((p) => ({ nombre: p.nombre, productos: data.holdings.filter((h) => h.portfolioId === p.id && h.cantidad > 1e-9).map((h) => ({ id: h.id, nombre: h.nombre, broker: h.broker })) }))
    .filter((g) => g.productos.length);
  const inicial = data.holdings.some((h) => h.id === producto) ? producto! : grupos[0]?.productos[0]?.id ?? '';

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <PageHeader back="/movimiento" title="Comisión" subtitle="Lo que te cobra el banco o el bróker aparte: custodia, mantenimiento, una comisión suelta…" />
      {grupos.length ? <FeeForm grupos={grupos} inicial={inicial} today={data.today} /> : (
        <p className="text-sm text-muted">Aún no tienes productos a los que asignar una comisión.</p>
      )}
    </div>
  );
}
