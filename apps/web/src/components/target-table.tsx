import { CLASE_LABEL } from '@kartera/core';
import Link from 'next/link';
import { eur, pct } from '@/lib/format';
import type { TargetLine, TargetSummary } from '@/lib/plan-view';
import { Card, H2, LinkButton } from './ui';

/** Por debajo de esta diferencia (EUR) el producto se considera en su objetivo. */
const TOLERANCIA_EUR = 5;

const pctTxt = (v: number) => pct(v, Math.abs(v * 100 - Math.round(v * 100)) > 0.05 && v < 0.1 ? 1 : 0);

/** Producto a producto: % real, % objetivo y cuánto añadir o retirar para cuadrar. */
export function TargetLines({ lines, showClase = false }: { lines: TargetLine[]; showClase?: boolean }) {
  const cols = 'sm:grid sm:grid-cols-[minmax(0,1fr)_56px_72px_128px] sm:items-center sm:gap-x-4';
  return (
    <div className="flex flex-col">
      <div className={`hidden border-b border-line pb-1.5 text-xs text-muted ${cols}`}>
        <span>Producto</span><span className="text-right">Real</span><span className="text-right">Objetivo</span><span className="text-right">Para cuadrar</span>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {lines.map((l) => {
          const enObjetivo = Math.abs(l.ajuste) < TOLERANCIA_EUR;
          return (
            <li key={l.assetId} className={`flex flex-col gap-1.5 py-2.5 text-sm ${cols}`}>
              <span className="flex min-w-0 flex-col">
                {l.holdingId ? <Link href={`/activos/${l.holdingId}`} className="font-medium hover:underline sm:truncate">{l.nombre}</Link> : <span className="font-medium sm:truncate">{l.nombre}</span>}
                {showClase ? <span className="text-xs text-muted">{CLASE_LABEL[l.clase]}</span> : null}
              </span>
              <span className="grid grid-cols-3 items-baseline gap-2 sm:contents">
                <span className="tabular text-muted-2 sm:text-right"><span className="text-xs text-muted sm:hidden">Real </span>{pctTxt(l.pctActual)}</span>
                <span className="font-semibold tabular sm:text-right"><span className="text-xs font-normal text-muted sm:hidden">Objetivo </span>{pctTxt(l.pctObjetivo)}</span>
                <span className="text-right tabular">
                  {enObjetivo ? <span className="text-xs font-semibold text-brand">✓ En objetivo</span>
                    : l.ajuste > 0 ? <span className="font-semibold whitespace-nowrap text-brand">Añadir {eur(l.ajuste)}</span>
                    : <span className="font-semibold whitespace-nowrap text-warn-ink">Retirar {eur(-l.ajuste)}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Inicio: la cartera objetivo de cada cartera frente a la real. */
export function TargetCard({ summaries }: { summaries: TargetSummary[] }) {
  const conPlan = summaries.filter((s) => s.tienePlan);
  const sinPlan = summaries.filter((s) => !s.tienePlan && s.objetivo !== 'colchon' && s.valor > 0);
  if (!conPlan.length && !sinPlan.length) return null;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <H2>Tu cartera objetivo</H2>
        <span className="text-[13px] text-muted">Lo que tienes frente a tu objetivo, y cuánto tendrías que añadir o retirar de cada producto para cuadrarlo.</span>
      </div>
      {conPlan.map((s) => (
        <div key={s.portfolioId} className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/carteras/${s.portfolioId}`} className="font-semibold hover:underline">{s.nombre}</Link>
            <span className="text-sm tabular text-muted">{eur(s.valor)}</span>
          </div>
          <TargetLines lines={s.lines} />
          {s.fuera.length ? <span className="text-xs text-muted">No cuentan (fuera del objetivo): {s.fuera.map((f) => f.nombre).join(', ')}.</span> : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <LinkButton href={`/carteras/${s.portfolioId}/invertir`} variant="secondary">
              {s.mensual > 0 ? `Repartir mi aportación de ${eur(s.mensual)}` : 'Repartir una aportación'}
            </LinkButton>
            <Link href={`/carteras/${s.portfolioId}/objetivo`} className="text-sm font-semibold text-brand">Editar objetivo</Link>
          </div>
        </div>
      ))}
      {sinPlan.map((s) => (
        <Link key={s.portfolioId} href={`/carteras/${s.portfolioId}/objetivo`} className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-3.5 hover:border-brand">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">{s.nombre}</span>
            <span className="text-[13px] text-muted">Define qué % quieres en cada producto y verás cuánto te falta o te sobra en cada uno.</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-brand">Definir →</span>
        </Link>
      ))}
    </Card>
  );
}
