import type { Metadata } from 'next';
import { DashboardView, type GoalView } from '@/components/dashboard-view';
import { TargetCard } from '@/components/target-table';
import { targetSummary } from '@/lib/plan-view';
import { Card, H2, LinkButton } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, labelMaps, loadUserData, toCoreHoldings } from '@/lib/data';
import { compactSeries, distributions, goalEta, stackBy } from '@/lib/view-models';
import { milestones } from '@kartera/core';
import { isValorAnotado } from '@/lib/db';

export const metadata: Metadata = { title: 'Inicio' };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ cartera?: string }> }) {
  const { cartera } = await searchParams;
  const { supabase, user } = await requireUser();
  const data = await loadUserData(supabase);
  const nombre = (user.user_metadata?.nombre as string | undefined) ?? 'Hola';

  if (data.portfolios.length === 0) return <FirstAccess nombre={nombre} />;

  const selected = data.portfolios.find((p) => p.id === cartera)?.id ?? null;
  const result = compute(data, selected);
  const holdings = toCoreHoldings(data);

  if (result.series.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-[26px] font-bold">{nombre}</h1>
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <H2 className="text-xl">Aún no has registrado nada</H2>
          <p className="max-w-sm text-sm text-muted">Importa los movimientos de tu bróker, añade tu primera aportación o apunta lo que tienes en el banco o en tu plan de pensiones.</p>
          <div className="flex w-full max-w-sm flex-col gap-2.5">
            <LinkButton href="/importar">Importar movimientos</LinkButton>
            <LinkButton href="/movimiento/aportacion" variant="secondary">Añadir una aportación</LinkButton>
            <LinkButton href="/saldos/nuevo" variant="secondary">Añadir cuenta, plan o depósito</LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  const goals: GoalView[] = data.portfolios
    .filter((p) => p.objetivo_importe && (!selected || p.id === selected))
    .map((p) => {
      const r = p.id === selected ? result : compute(data, p.id);
      return {
        id: p.id,
        nombre: p.nombre,
        valor: r.metrics.valor,
        objetivo: Number(p.objetivo_importe),
        anio: p.objetivo_anio,
        // Con plan, el ritmo es lo que piensas aportar; si no, tu media
        eta: goalEta(r.metrics.valor, Number(p.objetivo_importe), p.aportacion_mensual != null ? Number(p.aportacion_mensual) : r.metrics.aportacionMediaMensual, data.today),
      };
    });

  const objetivos = await Promise.all(
    data.portfolios.filter((p) => !selected || p.id === selected).map((p) => targetSummary(supabase, data, p, p.id === selected ? result : undefined)),
  );

  // Cuándo se actualizaron los precios por última vez
  let ultima = 0;
  for (const h of data.holdings) {
    const m = h.asset.metadata as { live_at?: string; sync_at?: string };
    for (const t of [m.live_at, m.sync_at]) if (t) ultima = Math.max(ultima, Date.parse(t));
  }
  const actualizado = ultima
    ? new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ultima))
    : null;

  // Recordatorio mensual: cuentas, planes y depósitos sin anotar este mes
  const anotados = data.holdings.filter((h) => isValorAnotado(h.asset) && (!selected || h.portfolio_id === selected));
  const mesActual = data.today.slice(0, 7);
  const pendientes = anotados.filter((h) => !(data.valuations[h.id] ?? []).some((v) => v.fecha.slice(0, 7) === mesActual)).length;

  return (
    <DashboardView
      actualizado={actualizado}
      hitos={milestones(result.series)}
      saldos={anotados.length ? { total: anotados.length, pendientes } : null}
      objetivo={<TargetCard summaries={objetivos} />}
      nombre={nombre}
      today={data.today}
      carteras={data.portfolios.map((p) => ({ id: p.id, nombre: p.nombre }))}
      selected={selected}
      metrics={result.metrics}
      value={compactSeries(result.series, data.today).map((p) => ({ fecha: p.fecha, valor: p.valor, aportado: p.aportado }))}
      byProduct={stackBy(result.series, holdings, 'producto', data.today)}
      byClass={stackBy(result.series, holdings, 'clase', data.today)}
      dists={distributions(result, holdings, labelMaps(data))}
      goals={goals}
      warnings={result.warnings}
    />
  );
}

function FirstAccess({ nombre }: { nombre: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">Bienvenido a Kartera</span>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Hola, {nombre}</h1>
      </div>
      <section className="flex flex-col gap-1.5 rounded-[18px] bg-ink p-5 text-white">
        <span className="text-[13px] text-[#B8B8B0]">Patrimonio total</span>
        <span className="text-[36px] font-bold">0 €</span>
        <span className="text-[13px] text-[#B8B8B0]">Aquí verás cuánto tienes, cuánto has aportado y cuánto has ganado.</span>
      </section>
      <Card className="flex flex-col items-center gap-3.5 border-dashed border-[#C9C9C2] py-8 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><rect x="4" y="4" width="64" height="64" rx="18" fill="#E8F5EF" /><path d="M18 48 L30 36 L38 42 L54 24" stroke="#16754E" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="54" cy="24" r="4" fill="#16754E" /></svg>
        <H2 className="text-[21px]">Empieza por tu primera cartera</H2>
        <p className="text-sm leading-relaxed text-muted">Ponle un objetivo (largo plazo, colchón, plan de pensiones…) y después importa tus movimientos o añádelos a mano.</p>
        <LinkButton href="/carteras/nueva?primera=1" className="mt-1 w-full">Crear mi primera cartera</LinkButton>
      </Card>
    </div>
  );
}
