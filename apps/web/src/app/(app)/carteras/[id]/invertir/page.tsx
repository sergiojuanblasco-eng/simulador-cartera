import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { priceOn } from '@/lib/movements';
import { planView } from '@/lib/plan-view';
import { InvestPlan } from './invest';

export const metadata: Metadata = { title: 'Invertir según mi plan' };

export default async function InvertirPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ primera?: string }> }) {
  const { id } = await params;
  const { primera } = await searchParams;
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

  const mensual = view.aportacionMensual ?? (Math.round(result.metrics.aportacionMediaMensual) || 0);
  const slots = await Promise.all(view.rows.filter((r) => r.pctObjetivo !== null).map(async (r) => ({
    assetId: r.assetId, nombre: r.nombre, pct: r.pctObjetivo!, actual: r.valor, nuevo: r.holdingId === null,
    // Sin precio conocido hay que indicar las participaciones al registrar
    sinPrecio: !(await priceOn(supabase, r.assetId, data.today)),
  })));

  return (
    <InvestPlan
      portfolio={{ id: p.id, nombre: p.nombre }}
      importe={mensual}
      primera={!!primera}
      today={data.today}
      broker={broker}
      slots={slots}
    />
  );
}
