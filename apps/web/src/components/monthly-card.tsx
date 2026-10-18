import Link from 'next/link';
import { eur, mesLargo } from '@/lib/format';
import type { MonthlyPlan } from '@/lib/plan-view';
import { Card, H2, LinkButton } from './ui';

const MAX_LINES = 5;

/** Inicio: qué te toca invertir este mes en cada cartera, producto a producto. */
export function MonthlyCard({ plans, mes }: { plans: MonthlyPlan[]; mes: string }) {
  const conPlan = plans.filter((p) => p.tienePlan);
  const sinPlan = plans.filter((p) => !p.tienePlan && p.objetivo !== 'colchon' && p.valor > 0);
  if (!conPlan.length && !sinPlan.length) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <H2>Tu aportación de este mes</H2>
        <span className="text-[13px] capitalize text-muted">{mesLargo(mes)}</span>
      </div>

      {conPlan.map((p) => {
        const ratio = p.mensual > 0 ? Math.min(1, p.aportadoMes / p.mensual) : 0;
        const hecho = p.mensual > 0 && p.restante === 0;
        return (
          <div key={p.portfolioId} className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <Link href={`/carteras/${p.portfolioId}`} className="font-semibold hover:underline">{p.nombre}</Link>
              <span className="text-sm tabular text-muted">{eur(p.aportadoMes)} de {eur(p.mensual)}</span>
            </div>
            {p.mensual > 0 ? (
              <div className="h-2 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Aportado este mes en ${p.nombre}`}>
                <div className="h-full rounded-full bg-brand" style={{ width: `${ratio * 100}%` }} />
              </div>
            ) : null}
            {p.mensual <= 0 ? (
              <Link href={`/carteras/${p.portfolioId}/objetivo`} className="text-sm font-semibold text-brand">Indica cuánto aportas al mes →</Link>
            ) : hecho ? (
              <span className="text-sm font-semibold text-brand">✓ Ya has aportado lo de este mes</span>
            ) : (
              <>
                <span className="text-[13px] text-muted">Te quedan {eur(p.restante)}. Para mantener tu objetivo:</span>
                <ul className="flex flex-col text-sm">
                  {p.lines.filter((l) => l.importe > 0).slice(0, MAX_LINES).map((l) => (
                    <li key={l.assetId} className="flex justify-between gap-3 py-1">
                      <span className="min-w-0 truncate">{l.nombre}</span>
                      <span className="shrink-0 font-semibold tabular">{eur(l.importe, l.importe % 1 ? 2 : 0)}</span>
                    </li>
                  ))}
                </ul>
                {p.lines.filter((l) => l.importe > 0).length > MAX_LINES ? <span className="text-xs text-muted">y {p.lines.filter((l) => l.importe > 0).length - MAX_LINES} más</span> : null}
                <LinkButton href={`/carteras/${p.portfolioId}/invertir`} className="self-start">Invertir {eur(p.restante)}</LinkButton>
              </>
            )}
          </div>
        );
      })}

      {sinPlan.map((p) => (
        <Link key={p.portfolioId} href={`/carteras/${p.portfolioId}/objetivo`} className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-3.5 hover:border-brand">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{p.nombre}</span>
            <span className="text-[13px] text-muted">Define qué % quieres en cada producto y te diremos cuánto poner cada mes.</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-brand">Definir →</span>
        </Link>
      ))}
    </Card>
  );
}
