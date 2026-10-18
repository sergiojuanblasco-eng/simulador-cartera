import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { planView } from '@/lib/plan-view';
import { InvestPlan } from './invest';

export const metadata: Metadata = { title: 'Invertir según mi plan' };

export default async function InvertirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const p = data.portfolios.find((x) => x.id === id);
  if (!p) notFound();
  const result = compute(data, id);
  const view = await planView(supabase, data, result, p);
  if (!view.tienePlan) redirect(`/carteras/${id}/objetivo`);

  // Bróker por defecto: el que más se usa en esta cartera.
  const uso = new Map<string, number>();
  for (const h of data.holdings.filter((x) => x.portfolio_id === id)) {
    const n = data.accounts.find((a) => a.id === h.account_id)?.nombre;
    if (n) uso.set(n, (uso.get(n) ?? 0) + 1);
  }
  const broker = [...uso.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Trade Republic';

  return (
    <InvestPlan
      portfolio={{ id: p.id, nombre: p.nombre }}
      mensual={view.aportacionMensual ?? (Math.round(result.metrics.aportacionMediaMensual) || 0)}
      today={data.today}
      broker={broker}
      slots={view.rows.filter((r) => r.pctObjetivo !== null).map((r) => ({
        assetId: r.assetId, nombre: r.nombre, pct: r.pctObjetivo!, actual: r.valor, nuevo: r.holdingId === null,
      }))}
    />
  );
}
