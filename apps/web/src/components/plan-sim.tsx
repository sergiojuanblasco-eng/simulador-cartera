'use client';

import { useMemo, useState } from 'react';
import { eur } from '@/lib/format';
import { proxyLabel, simulatePlan } from '@/lib/plan';
import { Card, H2 } from './ui';

/** Tarjeta «Si sigues este plan»: escenarios con datos históricos reales y probabilidad de llegar a la meta. */
export function PlanSimCard(p: {
  weights: Record<string, number>;
  initial: number;
  monthly: number;
  horizon: number;
  horizonText: string;
  goal: number | null;
  thisYear: number;
  conPlan: boolean;
}) {
  const [years, setYears] = useState(p.horizon);
  const sim = useMemo(
    () => simulatePlan({ weights: p.weights, initial: p.initial, monthly: p.monthly, years, goal: p.goal }),
    [p.weights, p.initial, p.monthly, years, p.goal],
  );
  const proxies = Object.entries(p.weights).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]);
  const totalW = proxies.reduce((a, [, w]) => a + w, 0) || 1;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <H2>Si sigues {p.conPlan ? 'este plan' : 'así'}</H2>
        <p className="text-[13px] text-muted">
          Con {eur(p.initial)} de hoy{p.monthly > 0 ? ` y ${eur(p.monthly)} al mes` : ''}, según lo que pasó de verdad en los mercados.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="sim-years" className="text-sm font-semibold">Plazo: {years} {years === 1 ? 'año' : 'años'} <span className="font-normal text-muted">({p.thisYear + years})</span></label>
          {years !== p.horizon ? <button type="button" onClick={() => setYears(p.horizon)} className="text-xs font-semibold text-brand">Volver a {p.horizon}</button> : null}
        </div>
        <input id="sim-years" type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-[#16754E]" />
        <span className="text-xs text-muted">{p.horizonText}</span>
      </div>

      {sim ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: 'Pesimista', v: sim.pesimista, cls: 'bg-warn-bg text-warn-ink' },
              { k: 'Esperado', v: sim.esperado, cls: 'bg-brand-soft text-brand-dark' },
              { k: 'Optimista', v: sim.optimista, cls: 'bg-subtle text-ink' },
            ].map((s) => (
              <div key={s.k} className={`flex flex-col gap-0.5 rounded-xl px-2 py-3 ${s.cls}`}>
                <span className="text-xs">{s.k}</span>
                <span className="text-[17px] font-bold tabular">{eur(s.v)}</span>
              </div>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Habrás aportado</dt><dd className="text-right font-semibold tabular">{eur(sim.invertido)}</dd>
            <dt className="text-muted">Probabilidad de perder dinero</dt>
            <dd className="text-right font-semibold tabular">{sim.probPerdida === 0 ? '< 1 %' : `${Math.round(sim.probPerdida * 100)} %`}</dd>
          </dl>
          {p.goal && sim.probMeta !== null ? (
            <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>Probabilidad de llegar a tu meta de <strong>{eur(p.goal)}</strong></span>
                <span className="shrink-0 text-lg font-bold whitespace-nowrap tabular text-brand-dark">{sim.probMeta >= 0.995 ? '> 99 %' : sim.probMeta < 0.005 ? '< 1 %' : `${Math.round(sim.probMeta * 100)} %`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(sim.probMeta * 100)}%` }} /></div>
            </div>
          ) : null}
          <details className="text-xs text-muted">
            <summary className="cursor-pointer py-1">Cómo lo calculamos</summary>
            <p className="mt-1 leading-relaxed">
              Repetimos tu plan en todos los periodos de {sim.recortado ?? years} años entre {sim.desde} y {sim.hasta} ({sim.ventanas} periodos).
              Pesimista = el 10 % peor; optimista = el 10 % mejor. Cada producto se simula con su índice:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {proxies.map(([id, w]) => <li key={id}>{proxyLabel(id)} · {Math.round((w / totalW) * 100)} %</li>)}
            </ul>
            {sim.recortado ? <p className="mt-1">No hay {years} años de historia para todos los productos: usamos periodos de {sim.recortado} años.</p> : null}
            <p className="mt-1">Rentabilidades pasadas no garantizan las futuras.</p>
          </details>
        </>
      ) : <p className="text-sm text-muted">No hay datos suficientes para simular estos productos.</p>}
    </Card>
  );
}
