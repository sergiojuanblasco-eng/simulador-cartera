import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { splitContribution } from '@kartera/core';
import { PlanSimCard } from '@/components/plan-sim';
import { Alert, Card, H2, LinkButton, PageHeader, Stat } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { GOAL_PRESETS } from '@/lib/db';
import { eur, eurSigned, pct, pctSigned } from '@/lib/format';
import { defaultHorizon, GOAL_HORIZON_TEXT } from '@/lib/plan';
import { planView } from '@/lib/plan-view';

export const metadata: Metadata = { title: 'Cartera' };

/** Diferencia (en puntos) a partir de la cual avisamos de que un producto se ha desviado. */
const DESVIO = 0.03;

export default async function CarteraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const p = data.portfolios.find((x) => x.id === id);
  if (!p) notFound();

  const result = compute(data, id);
  const m = result.metrics;
  const view = await planView(supabase, data, result, p);
  const thisYear = Number(data.today.slice(0, 4));
  const goalName = GOAL_PRESETS.find((g) => g.objetivo === p.objetivo)?.nombre ?? 'Personalizada';
  const mensual = view.aportacionMensual ?? Math.round(m.aportacionMediaMensual);
  const goal = p.objetivo_importe ? Number(p.objetivo_importe) : null;

  // Pesos para simular: el plan si existe; si no, lo que tienes hoy.
  const weights: Record<string, number> = {};
  for (const r of view.rows) {
    const w = view.tienePlan ? r.pctObjetivo ?? 0 : r.pctActual * 100;
    if (w > 0) weights[r.proxy] = (weights[r.proxy] ?? 0) + w;
  }

  const planRows = view.rows.filter((r) => r.pctObjetivo !== null);
  const fuera = view.rows.filter((r) => r.pctObjetivo === null);
  const split = view.tienePlan && mensual > 0
    ? splitContribution(mensual, planRows.map((r) => ({ key: r.assetId, peso: r.pctObjetivo!, actual: r.valor })), 'equilibrar')
    : [];
  const desviados = planRows.filter((r) => view.total > 0 && Math.abs(r.pctActual - r.pctObjetivo! / 100) >= DESVIO).length;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader back="/carteras" title={p.nombre} subtitle={`${goalName} · ${GOAL_HORIZON_TEXT[p.objetivo]}`} />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Valor" value={eur(m.valor)} />
        <Stat label="Ganancia" value={eurSigned(m.ganancia)} sub={pctSigned(m.gananciaPct)} tone={m.ganancia >= 0 ? 'pos' : 'neg'} />
        <Stat label="Aportas al mes" value={eur(mensual)} sub={view.aportacionMensual !== null ? 'Según tu plan' : 'Tu media hasta ahora'} />
        <Stat label="Meta" value={goal ? eur(goal) : '—'} sub={goal ? (p.objetivo_anio ? `En ${p.objetivo_anio}` : 'Sin fecha') : 'Ponla en «Mis carteras»'} />
      </div>

      {view.sinMigracion ? <Alert>Para guardar tu cartera objetivo falta un paso en la base de datos (Supabase). Mientras tanto puedes ver la simulación.</Alert> : null}

      {!view.tienePlan ? (
        <Card className="flex flex-col gap-3">
          <H2>Tu cartera objetivo</H2>
          <p className="text-sm text-muted-2">
            Decide qué % quieres en cada producto. Cada mes te diremos cuánto poner en cada uno para mantener ese reparto, y te enseñamos adónde puede llegar.
          </p>
          <LinkButton href={`/carteras/${id}/objetivo`} className="self-start">Crear mi cartera objetivo</LinkButton>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <H2>Tu cartera objetivo</H2>
              <Link href={`/carteras/${id}/objetivo`} className="text-sm font-semibold text-brand">Editar</Link>
            </div>
            <p className="-mt-1 text-[13px] text-muted">
              {view.total === 0 ? 'Aún no has invertido en esta cartera.' : desviados === 0 ? 'Vas en línea con tu objetivo. 👌' : `${desviados} ${desviados === 1 ? 'producto se ha desviado' : 'productos se han desviado'} más de 3 puntos: las próximas aportaciones lo corrigen.`}
            </p>
            <ul className="flex flex-col gap-3.5">
              {planRows.map((r) => {
                const obj = r.pctObjetivo! / 100;
                const diff = r.pctActual - obj;
                return (
                  <li key={r.assetId} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      {r.holdingId ? <Link href={`/activos/${r.holdingId}`} className="min-w-0 truncate font-semibold hover:underline">{r.nombre}</Link> : <span className="min-w-0 truncate font-semibold">{r.nombre}</span>}
                      <span className="shrink-0 tabular"><span className="text-muted">hoy {pct(r.pctActual, 0)} ·</span> <strong>objetivo {pct(obj, (obj * 100) % 1 ? 1 : 0)}</strong></span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-subtle" aria-hidden="true">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-[#A7D7BF]" style={{ width: `${Math.min(100, r.pctActual * 100)}%` }} />
                      <div className="absolute -top-1 h-[18px] w-[3px] rounded bg-ink" style={{ left: `calc(${Math.min(100, obj * 100)}% - 1.5px)` }} />
                    </div>
                    {view.total > 0 && Math.abs(diff) >= DESVIO ? (
                      <span className={`text-xs ${diff > 0 ? 'text-warn-ink' : 'text-muted-2'}`}>{diff > 0 ? `${Math.round(diff * 100)} puntos por encima` : `${Math.round(-diff * 100)} puntos por debajo`}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {fuera.length ? (
              <p className="text-xs text-muted">Fuera del objetivo (no se aporta más): {fuera.map((r) => r.nombre).join(', ')}.</p>
            ) : null}
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-full bg-[#A7D7BF]" />Hoy</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-[3px] rounded bg-ink" />Objetivo</span>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <H2>Este mes</H2>
              <span className="text-sm font-semibold tabular">{eur(mensual)}</span>
            </div>
            {split.length ? (
              <>
                <p className="-mt-1 text-[13px] text-muted">Para acercarte a tu objetivo, reparte así tu aportación:</p>
                <ul className="flex flex-col divide-y divide-line text-sm">
                  {split.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">{planRows.find((r) => r.assetId === s.key)?.nombre}</span>
                      <span className={`shrink-0 font-semibold tabular ${s.importe === 0 ? 'text-muted' : ''}`}>{s.importe === 0 ? '—' : eur(s.importe, s.importe % 1 ? 2 : 0)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="text-sm text-muted">Indica cuánto aportas al mes en tu plan y te diremos cómo repartirlo.</p>}
            <LinkButton href={`/carteras/${id}/invertir`} className="self-start">Invertir ahora</LinkButton>
          </Card>
        </>
      )}

      {p.objetivo === 'colchon' ? (
        <Card className="flex flex-col gap-2">
          <H2>Un colchón no se invierte para ganar</H2>
          <p className="text-sm text-muted-2">Es el dinero para imprevistos: tiene que estar disponible y sin sustos. Lo habitual es guardar de 3 a 6 meses de gastos en un fondo monetario o una cuenta remunerada.</p>
        </Card>
      ) : Object.keys(weights).length ? (
        <PlanSimCard
          weights={weights}
          initial={Math.round(m.valor)}
          monthly={mensual}
          horizon={defaultHorizon(p.objetivo, p.objetivo_anio, thisYear)}
          horizonText={GOAL_HORIZON_TEXT[p.objetivo]}
          goal={goal}
          thisYear={thisYear}
          conPlan={view.tienePlan}
        />
      ) : null}
    </div>
  );
}
