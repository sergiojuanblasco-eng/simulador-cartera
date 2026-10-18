import type { Metadata } from 'next';
import Link from 'next/link';
import { addDays, whatIf } from '@kartera/core';
import { ValueChart, YearBars } from '@/components/charts';
import { Card, H2, PageHeader, Stat } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { loadBenchmark, yearlyFromPrices } from '@/lib/benchmark';
import { compute, loadUserData } from '@/lib/data';
import { effectiveTer } from '@/lib/market/ter-catalog';
import { eur, eurSigned, pct, pctSigned } from '@/lib/format';
import { compactSeries } from '@/lib/view-models';

export const metadata: Metadata = { title: 'Rendimiento' };

export default async function RendimientoPage() {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const result = compute(data);
  const m = result.metrics;

  if (result.series.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Rendimiento" />
        <Card className="text-sm text-muted">Cuando registres movimientos verás aquí la rentabilidad por año, la comparativa con el índice y lo que pagas en comisiones.</Card>
      </div>
    );
  }

  const series = compactSeries(result.series, data.today);
  const bench = await loadBenchmark(supabase, addDays(result.series[0]!.fecha, -10));
  const wi = bench ? whatIf(result.flows, bench.prices, series.map((p) => p.fecha)) : null;
  const benchYears = bench ? yearlyFromPrices(bench.prices) : null;
  const rows = series.map((p, i) => ({ fecha: p.fecha, valor: p.valor, aportado: p.aportado, indice: wi?.serie[i]?.valor }));
  const years = m.rentabilidadAnual.map((y) => ({ ...y, indice: benchYears?.get(y.anio) ?? null }));

  const holdings = new Map(data.holdings.map((h) => [h.id, h]));
  const comisiones = result.positions
    // Cripto y efectivo no tienen TER
    .filter((p) => p.valor > 0 && !['cripto', 'efectivo'].includes(holdings.get(p.holdingId)!.asset.tipo))
    .map((p) => {
      const h = holdings.get(p.holdingId)!;
      const ter = effectiveTer(h.ter, h.asset);
      return { id: p.holdingId, nombre: h.asset.nombre, valor: p.valor, ter, coste: ter === null ? null : p.valor * ter, puedeEditar: true };
    })
    .sort((a, b) => (b.coste ?? -1) - (a.coste ?? -1));

  const feesByProduct = result.positions
    .filter((p) => p.comisiones > 0)
    .map((p) => ({ id: p.holdingId, nombre: holdings.get(p.holdingId)!.asset.nombre, importe: p.comisiones }))
    .sort((a, b) => b.importe - a.importe);

  const realizedByYear = new Map<number, number>();
  for (const r of result.realized) {
    const y = Number(r.fecha.slice(0, 4));
    realizedByYear.set(y, (realizedByYear.get(y) ?? 0) + r.ganancia);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Rendimiento" subtitle="Cómo lo estás haciendo, sin el efecto de tus aportaciones" />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="TIR anualizada" value={m.tir === null ? '—' : pct(m.tir)} sub="Incluye cuándo aportaste" />
        <Stat label="Ganancia total" value={eurSigned(m.ganancia)} sub={`${pctSigned(m.gananciaPct)}${m.comisionesPagadas > 0 ? ' · ya descontadas comisiones' : ''}`} tone={m.ganancia >= 0 ? 'pos' : 'neg'} />
        <Stat label="Caída máxima" value={pct(m.maxDrawdown)} sub="Desde un máximo" tone={m.maxDrawdown < -0.0005 ? 'neg' : undefined} />
        <Stat label="Comisiones pagadas" value={eur(m.comisionesPagadas, 2)} sub={m.terMedio === null ? 'Compras y ventas' : `+ TER ≈ ${eur(m.costeAnual)}/año`} />
      </div>

      <Card className="flex flex-col gap-3">
        <H2>Rentabilidad por año natural</H2>
        <p className="-mt-2 text-[13px] text-muted">Rentabilidad ponderada en el tiempo: aísla el efecto de cuánto y cuándo aportaste. {benchYears ? 'En beige, el MSCI World.' : ''}</p>
        <YearBars data={years} />
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-medium">Año</th><th className="py-1 text-right font-medium">Tu cartera</th>{benchYears ? <th className="py-1 text-right font-medium">MSCI World</th> : null}</tr></thead>
          <tbody>
            {[...years].reverse().map((y) => (
              <tr key={y.anio} className="border-t border-line">
                <td className="py-2">{y.anio}{y.parcial ? <span className="text-xs text-muted"> (parcial)</span> : null}</td>
                <td className={`py-2 text-right font-semibold tabular ${y.rentabilidad >= 0 ? 'text-pos' : 'text-neg'}`}>{pctSigned(y.rentabilidad)}</td>
                {benchYears ? <td className="py-2 text-right tabular text-muted-2">{pctSigned(y.indice)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="flex flex-col gap-3">
        <H2>¿Y si lo hubieras metido todo en el índice?</H2>
        {wi ? (
          <>
            <p className="text-sm text-muted-2">
              Con las mismas aportaciones, en las mismas fechas, en el MSCI World tendrías <strong className="text-ink">{eur(wi.valor)}</strong>.
              Tu cartera vale <strong className="text-ink">{eur(m.valor)}</strong>:{' '}
              <span className={m.valor >= wi.valor ? 'font-semibold text-pos' : 'font-semibold text-neg'}>{eurSigned(m.valor - wi.valor)}</span> frente al índice.
            </p>
            <ValueChart rows={rows} showIndex />
            <div className="flex flex-wrap gap-5 text-[13px]">
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-brand" />Tu cartera</span>
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-[#D9822B]" />MSCI World</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-[#A1A1AA]" />Aportado</span>
            </div>
          </>
        ) : <p className="text-sm text-muted">La comparativa aparecerá cuando se carguen los precios del índice (proceso nocturno).</p>}
      </Card>

      <Card className="flex flex-col gap-4">
        <H2>Lo que pagas en comisiones</H2>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold">Comisiones de compra y venta</h3>
            <span className="font-semibold tabular">{eur(m.comisionesPagadas, 2)}</span>
          </div>
          <p className="text-[13px] text-muted">Lo que te cobra el bróker en cada operación (por ejemplo, 1 € por orden en Trade Republic). Ya está restado de tu ganancia, pero no cuenta como pérdida del mercado.</p>
          {m.comisionesPagadas > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ul className="flex flex-col divide-y divide-line text-sm">
                {[...m.comisionesPorAnio].reverse().map((y) => (
                  <li key={y.anio} className="flex justify-between py-2"><span>{y.anio}</span><span className="tabular">{eur(y.importe, 2)}</span></li>
                ))}
              </ul>
              <ul className="flex flex-col divide-y divide-line text-sm">
                {feesByProduct.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate">{c.nombre}</span><span className="tabular">{eur(c.importe, 2)}</span></li>
                ))}
              </ul>
            </div>
          ) : <p className="text-sm text-muted-2">No has pagado comisiones por operar. 👌</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold">Gastos de los fondos (TER)</h3>
            <span className="font-semibold tabular">{m.terMedio === null ? '—' : `≈ ${eur(m.costeAnual)}/año`}</span>
          </div>
          <p className="text-[13px] text-muted">
            El fondo o ETF se lo cobra cada día dentro de su precio: no aparece como un cargo, pero te cuesta.
            {m.terMedio !== null ? <> TER medio: <strong className="text-ink">{pct(m.terMedio, 2)}</strong> · {eur(m.costeMensual, 2)} al mes.</> : null}
          </p>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {comisiones.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <Link href={`/activos/${c.id}`} className="min-w-0 flex-1 truncate hover:underline">{c.nombre}</Link>
                <span className="w-14 text-right text-muted tabular">{c.ter === null ? '—' : pct(c.ter, 2)}</span>
                <span className="w-20 text-right font-semibold tabular">{c.coste === null ? '—' : `${eur(c.coste)}/año`}</span>
              </li>
            ))}
          </ul>
          {comisiones.some((c) => c.ter === null && c.puedeEditar) ? (
            <p className="text-[13px] text-muted">Donde ves «—», entra en el producto y escribe su TER (en la ficha del fondo, «gastos corrientes»).</p>
          ) : null}
        </div>
      </Card>

      {realizedByYear.size ? (
        <Card className="flex flex-col gap-2">
          <H2>Ganancias realizadas (para la renta)</H2>
          <p className="-mt-1 text-[13px] text-muted">Ventas calculadas por FIFO. Los traspasos entre fondos no cuentan. Orientativo: contrasta con el informe fiscal de tu bróker.</p>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {[...realizedByYear.entries()].sort((a, b) => b[0] - a[0]).map(([y, g]) => (
              <li key={y} className="flex justify-between py-2"><span>{y}</span><span className={`font-semibold tabular ${g >= 0 ? 'text-pos' : 'text-neg'}`}>{eurSigned(g, 2)}</span></li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
