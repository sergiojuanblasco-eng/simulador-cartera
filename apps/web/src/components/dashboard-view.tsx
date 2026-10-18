import Link from 'next/link';
import type { Metrics } from '@kartera/core';
import { DashboardCharts, DistributionCard } from '@/components/dashboard';
import { Card, H2, LinkButton, Stat } from '@/components/ui';
import { eur, eurSigned, mesLargo, pct, pctSigned } from '@/lib/format';
import type { DistributionSets, StackSeries } from '@/lib/view-models';

export interface GoalView {
  id: string;
  nombre: string;
  valor: number;
  objetivo: number;
  anio: number | null;
  eta: string | null;
}

export interface DashboardViewProps {
  nombre: string;
  today: string;
  carteras: { id: string; nombre: string }[];
  selected: string | null;
  metrics: Metrics;
  value: { fecha: string; valor: number; aportado: number }[];
  byProduct: StackSeries;
  byType: StackSeries;
  dists: DistributionSets;
  goals: GoalView[];
  warnings: string[];
  baseHref?: string;
}

function saludo(): string {
  const h = Number(new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(new Date()));
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

export function DashboardView(p: DashboardViewProps) {
  const m = p.metrics;
  const base = p.baseHref ?? '/';
  const up = m.ganancia >= 0;
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted">{saludo()}</span>
          <h1 className="font-display text-[26px] font-bold tracking-tight">{p.nombre}</h1>
        </div>
        <Link href="/movimiento" aria-label="Nuevo movimiento" className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white lg:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </Link>
      </header>

      {p.carteras.length > 1 ? (
        <nav aria-label="Filtrar por cartera" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Link href={base} aria-current={!p.selected ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!p.selected ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>Todo</Link>
          {p.carteras.map((c) => (
            <Link key={c.id} href={`${base}?cartera=${c.id}`} aria-current={p.selected === c.id ? 'page' : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${p.selected === c.id ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>{c.nombre}</Link>
          ))}
        </nav>
      ) : null}

      <section className="flex flex-col gap-4 rounded-[18px] bg-ink p-5 text-white">
        <span className="text-[13px] text-[#B8B8B0]">Patrimonio {p.selected ? 'de la cartera' : 'total'}</span>
        <div className="flex flex-col gap-1">
          <span className="text-[38px] leading-none font-bold tracking-tight tabular">{eur(m.valor)}</span>
          <span className={`text-[15px] font-semibold tabular ${up ? 'text-pos-on-dark' : 'text-neg-on-dark'}`}>
            {up ? '▲' : '▼'} {eurSigned(m.ganancia)} ({pctSigned(m.gananciaPct)}) desde el inicio
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-ink-2 pt-3">
          <div className="flex flex-col"><span className="text-xs text-[#B8B8B0]">Capital aportado</span><span className="font-semibold tabular">{eur(m.aportado)}</span></div>
          <div className="flex flex-col"><span className="text-xs text-[#B8B8B0]">Mercado este mes</span>
            <span className={`font-semibold tabular ${m.mesActual.ganancia >= 0 ? 'text-pos-on-dark' : 'text-neg-on-dark'}`}>{eurSigned(m.mesActual.ganancia)}</span></div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="TIR anualizada" value={m.tir === null ? '—' : pct(m.tir)} sub={m.tir === null ? 'Con 3 meses de historia' : 'Rentabilidad real por año'} />
        <Stat label="Aportación media" value={`${eur(m.aportacionMediaMensual)}/mes`} sub={m.racha > 0 ? `Racha: ${m.racha} ${m.racha === 1 ? 'mes' : 'meses seguidos'}` : 'Sin racha activa'} tone={m.racha > 0 ? 'brand' : undefined} />
        <Stat label="Caída máxima" value={pct(m.maxDrawdown)} sub="Peor bache (drawdown)" tone={m.maxDrawdown < -0.0005 ? 'neg' : undefined} />
        <Stat label="Comisiones" value={eur(m.comisionesPagadas, 2)}
          sub={`Pagadas en compras y ventas · ${m.terMedio === null ? 'TER de los fondos: pendiente' : `TER ${pct(m.terMedio, 2)} ≈ ${eur(m.costeAnual)}/año`}`} />
      </div>

      <DashboardCharts today={p.today} value={p.value} byProduct={p.byProduct} byType={p.byType} />

      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionCard sets={p.dists} />
        <Card className="flex flex-col gap-4">
          <H2>Objetivos</H2>
          {p.goals.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">Ponle un importe meta a tus carteras para ver cuánto te falta y cuándo llegarías.</p>
              <LinkButton href="/carteras" variant="secondary" className="self-start">Poner un objetivo</LinkButton>
            </div>
          ) : p.goals.map((g) => {
            const ratio = Math.min(1, g.valor / g.objetivo);
            return (
              <div key={g.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/carteras/${g.id}`} className="font-semibold hover:underline">{g.nombre}: {eur(g.objetivo)}{g.anio ? ` en ${g.anio}` : ''}</Link>
                  <span className="text-sm font-bold text-brand tabular">{pct(ratio, 1)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${g.nombre}`}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
                </div>
                <span className="text-[13px] text-muted">
                  {g.eta === 'conseguido' ? '¡Objetivo conseguido!' : g.eta ? `A este ritmo lo alcanzarías en ${mesLargo(g.eta)} (suponiendo un 5 % anual)` : 'A este ritmo no se alcanza: prueba a aportar más.'}
                  {' '}<Link href={`/carteras/${g.id}`} className="font-semibold text-brand">Ver plan →</Link>
                </span>
              </div>
            );
          })}
        </Card>
      </div>

      {p.warnings.length ? (
        <details className="rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          <summary className="cursor-pointer font-semibold">Hay {p.warnings.length} aviso{p.warnings.length > 1 ? 's' : ''} sobre tus datos</summary>
          <ul className="mt-2 list-disc pl-5">{p.warnings.slice(0, 8).map((w) => <li key={w}>{w}</li>)}</ul>
        </details>
      ) : null}
    </div>
  );
}
