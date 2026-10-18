import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CLASE_LABEL } from '@kartera/core';
import { PlanSimCard } from '@/components/plan-sim';
import { Alert, Card, H2, LinkButton, PageHeader, Stat } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { GOAL_PRESETS } from '@/lib/db';
import { eur, eurSigned, pct, pctSigned } from '@/lib/format';
import { defaultHorizon, GOAL_HORIZON_TEXT } from '@/lib/plan';
import { TargetLines } from '@/components/target-table';
import { planView, targetSummary } from '@/lib/plan-view';

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
  const target = await targetSummary(supabase, data, p, result);
  const thisYear = Number(data.today.slice(0, 4));
  const goalName = GOAL_PRESETS.find((g) => g.objetivo === p.objetivo)?.nombre ?? 'Personalizada';
  const goal = p.objetivo_importe ? Number(p.objetivo_importe) : null;

  // Pesos para simular: el plan si existe; si no, lo que tienes hoy.
  const weights: Record<string, number> = {};
  for (const r of view.rows) {
    const w = view.tienePlan ? r.pctObjetivo ?? 0 : r.pctActual * 100;
    if (w > 0) weights[r.proxy] = (weights[r.proxy] ?? 0) + w;
  }

  const desviados = target.lines.filter((l) => view.total > 0 && Math.abs(l.pctActual - l.pctObjetivo) >= DESVIO).length;

  // Resumen por clase de activo: hoy frente a objetivo
  const clases = new Map<string, { hoy: number; obj: number }>();
  for (const r of view.rows) {
    const c = clases.get(r.clase) ?? { hoy: 0, obj: 0 };
    c.hoy += r.pctActual;
    c.obj += (r.pctObjetivo ?? 0) / 100;
    clases.set(r.clase, c);
  }
  const claseRows = [...clases.entries()].filter(([, v]) => v.hoy > 0.0005 || v.obj > 0).sort((a, b) => b[1].obj - a[1].obj || b[1].hoy - a[1].hoy);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader back="/carteras" title={p.nombre} subtitle={`${goalName} · ${GOAL_HORIZON_TEXT[p.objetivo]}`} />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Valor" value={eur(m.valor)} />
        <Stat label="Ganancia" value={eurSigned(m.ganancia)} sub={pctSigned(m.gananciaPct)} tone={m.ganancia >= 0 ? 'pos' : 'neg'} />
        <Stat label="Aportas al mes" value={eur(target.mensual)} sub={target.mensualDelPlan ? 'Según tu plan' : 'Tu media hasta ahora'} />
        <Stat label="Meta" value={goal ? eur(goal) : '—'} sub={goal ? (p.objetivo_anio ? `En ${p.objetivo_anio}` : 'Sin fecha') : 'Ponla en «Mis carteras»'} />
      </div>

      {view.sinMigracion ? <Alert>Para guardar tu cartera objetivo falta un paso en la base de datos (Supabase).</Alert> : null}

      {!view.tienePlan ? (
        <Card className="flex flex-col gap-3 border-2 border-brand">
          <H2>Define tu cartera objetivo</H2>
          <p className="text-sm text-muted-2">
            Dinos qué % quieres en cada producto y cuánto aportas al mes. Cada mes te diremos cuánto poner en cada uno para mantener ese reparto.
          </p>
          <LinkButton href={`/carteras/${id}/objetivo`} className="self-start">Definir mi cartera objetivo</LinkButton>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <H2>Tu cartera objetivo</H2>
            <Link href={`/carteras/${id}/objetivo`} className="text-sm font-semibold text-brand">Editar</Link>
          </div>
          <p className="-mt-1 text-[13px] text-muted">
            {view.total === 0 ? 'Aún no has invertido en esta cartera.' : desviados === 0 ? 'Vas en línea con tu objetivo. 👌' : `${desviados} ${desviados === 1 ? 'producto se ha desviado' : 'productos se han desviado'} más de 3 puntos.`}
            {' '}«Para cuadrar»: cuánto añadir o retirar de cada producto para estar justo en tu objetivo.
          </p>
          <TargetLines lines={target.lines} showClase />
          {target.fuera.length ? <p className="text-xs text-muted">Fuera del objetivo (no cuentan; no se aporta más): {target.fuera.map((r) => r.nombre).join(', ')}.</p> : null}
          <p className="text-[13px] text-muted">Para cuadrar sin vender nada, reparte tus aportaciones hacia lo que falta.</p>
          <LinkButton href={`/carteras/${id}/invertir`} className="self-start">
            {target.mensual > 0 ? `Repartir mi aportación de ${eur(target.mensual)}` : 'Repartir una aportación'}
          </LinkButton>
        </Card>
      )}

      {claseRows.length ? (
        <Card className="flex flex-col gap-2">
          <H2>Por clase de activo</H2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Clase</th><th className="py-1 text-right font-medium">Hoy</th>{view.tienePlan ? <th className="py-1 text-right font-medium">Objetivo</th> : null}</tr></thead>
            <tbody>
              {claseRows.map(([c, v]) => (
                <tr key={c} className="border-t border-line">
                  <td className="py-2">{CLASE_LABEL[c]}</td>
                  <td className="py-2 text-right tabular">{pct(v.hoy, 0)}</td>
                  {view.tienePlan ? <td className="py-2 text-right font-semibold tabular">{pct(v.obj, 0)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {p.objetivo === 'colchon' ? (
        <Card className="flex flex-col gap-2">
          <H2>Un colchón no se invierte para ganar</H2>
          <p className="text-sm text-muted-2">Es el dinero para imprevistos: tiene que estar disponible y sin sustos. Lo habitual es guardar de 3 a 6 meses de gastos en un fondo monetario o una cuenta remunerada.</p>
        </Card>
      ) : Object.keys(weights).length ? (
        <PlanSimCard
          weights={weights}
          initial={Math.round(m.valor)}
          monthly={target.mensual}
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
