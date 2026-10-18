import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { planView } from '@/lib/plan-view';
import { PlanEditor } from './editor';

export const metadata: Metadata = { title: 'Cartera objetivo' };

export default async function ObjetivoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nueva?: string }> }) {
  const { id } = await params;
  const { nueva } = await searchParams;
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const p = data.portfolios.find((x) => x.id === id);
  if (!p) notFound();
  const result = compute(data, id);
  const view = await planView(supabase, data, result, p);

  return (
    <PlanEditor
      portfolio={{ id: p.id, nombre: p.nombre }}
      tienePlan={view.tienePlan}
      mensual={view.aportacionMensual ?? (Math.round(result.metrics.aportacionMediaMensual) || null)}
      rows={view.rows.map((r) => ({
        assetId: r.assetId, nombre: r.nombre, tipo: r.tipo, isin: r.isin,
        pctActual: r.pctActual, pctObjetivo: r.pctObjetivo, proxy: r.proxy, proxyAprox: r.proxyAprox, clase: r.clase,
      }))}
      next={nueva ? `/carteras/${p.id}/invertir?primera=1` : null}
    />
  );
}
