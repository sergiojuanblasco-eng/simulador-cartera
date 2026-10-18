import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CLASE_LABEL, TIPO_LABEL, vehiculoOf } from '@kartera/core';
import { claseOf, detectClase, isClase } from '@/lib/asset-class';
import { PriceChart } from '@/components/charts';
import { DeleteTxButton } from '@/components/delete-tx';
import { EditAssetCard } from '@/components/edit-asset';
import { detectCrypto } from '@/lib/crypto';
import { Card, H2, PageHeader, Stat } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { eur, eurSigned, fechaCorta, pct, pctSigned, qty } from '@/lib/format';
import { TX_LABEL, TX_TONE } from '@/lib/tx-labels';
import { compactSeries } from '@/lib/view-models';

export const metadata: Metadata = { title: 'Producto' };

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const h = data.holdings.find((x) => x.id === id);
  if (!h) notFound();

  const result = compute(data);
  const p = result.positions.find((x) => x.holdingId === id);
  const txs = data.txs.filter((t) => t.holding_id === id);
  const realized = result.realized.filter((r) => r.holdingId === id).reduce((a, r) => a + r.ganancia, 0);
  const cartera = data.portfolios.find((x) => x.id === h.portfolio_id)?.nombre;
  const cuenta = data.accounts.find((x) => x.id === h.account_id)?.nombre;

  const prices = (data.prices[h.asset_id] ?? []).map((x) => ({ fecha: x.fecha, precio: Number(x.precio) }));
  const marks = txs
    .filter((t) => (t.tipo === 'compra' || t.tipo === 'venta') && Number(t.cantidad) > 0)
    .map((t) => ({ fecha: t.fecha, precio: t.precio ? Number(t.precio) : Number(t.importe) / Number(t.cantidad), tipo: t.tipo as 'compra' | 'venta' }));
  const ter = h.asset.ter === null ? null : Number(h.asset.ter);
  const meta = h.asset.metadata as { top10?: { nombre: string; peso: number }[] };
  const propio = h.asset.owner_id !== null;
  const cripto = propio && h.asset.tipo !== 'cripto' ? detectCrypto({ nombre: h.asset.nombre, isin: h.asset.isin, ticker: h.asset.ticker }) : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader back="/activos" title={h.asset.nombre} subtitle={[CLASE_LABEL[claseOf(h.clase, h.asset)], TIPO_LABEL[vehiculoOf(h.asset.tipo)], h.asset.isin, cartera, cuenta].filter(Boolean).join(' · ')} />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Valor" value={eur(p?.valor ?? 0)} sub={p?.fechaPrecio ? `Precio a ${fechaCorta(p.fechaPrecio)}` : undefined} />
        <Stat label="Ganancia" value={eurSigned(p?.ganancia ?? 0)} sub={pctSigned(p?.gananciaPct)} tone={(p?.ganancia ?? 0) >= 0 ? 'pos' : 'neg'} />
        <Stat label="Participaciones" value={qty(p?.cantidad ?? 0)} sub={p?.precioMedio ? `Coste medio ${p.precioMedio.toLocaleString('es-ES', { maximumFractionDigits: 4 })} €` : undefined} />
        <Stat label="Comisiones" value={ter === null ? (p?.comisiones ? eur(p.comisiones, 2) : '—') : `TER ${pct(ter, 2)}`}
          sub={[ter !== null && p ? `≈ ${eur(p.valor * ter)}/año` : null, p?.comisiones ? `${eur(p.comisiones, 2)} pagadas al operar` : null].filter(Boolean).join(' · ') || 'Sin dato de TER'} />
      </div>

      <EditAssetCard holdingId={h.id} propio={propio} nombre={h.asset.nombre} tipo={h.asset.tipo} terPct={ter === null ? null : Math.round(ter * 1e6) / 1e4}
        isin={h.asset.isin} sugerencia={cripto ? cripto.symbol : null}
        clase={claseOf(h.clase, h.asset)} claseAuto={!isClase(h.clase)} claseDetectada={detectClase(h.asset)} />

      <Card className="flex flex-col gap-3">
        <div>
          <H2>Valor liquidativo</H2>
          <p className="text-[13px] text-muted">Con tus compras (●) y ventas (◆) marcadas · precio en {h.asset.moneda}</p>
        </div>
        {prices.length > 1 ? <PriceChart rows={compactSeries(prices, data.today, 800)} marks={marks} /> : (
          <p className="text-sm text-muted">Aún no tenemos el histórico de precios de este producto. Se actualiza cada noche.</p>
        )}
      </Card>

      {realized !== 0 ? (
        <Card className="flex items-center justify-between">
          <span className="text-sm text-muted-2">Ganancia realizada en ventas (FIFO)</span>
          <span className={`font-semibold tabular ${realized >= 0 ? 'text-pos' : 'text-neg'}`}>{eurSigned(realized, 2)}</span>
        </Card>
      ) : null}

      {meta.top10?.length ? (
        <Card className="flex flex-col gap-2">
          <H2>Principales posiciones</H2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {meta.top10.map((t) => <li key={t.nombre} className="flex justify-between"><span>{t.nombre}</span><span className="tabular">{pct(t.peso)}</span></li>)}
          </ul>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-2">
        <H2>Movimientos</H2>
        <ul className="flex flex-col divide-y divide-line">
          {[...txs].reverse().map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TX_TONE[t.tipo]}`}>{TX_LABEL[t.tipo]}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold tabular">{eur(Number(t.importe), 2)}</span>
                <span className="text-xs text-muted">{fechaCorta(t.fecha)} · {qty(Number(t.cantidad))} part.{Number(t.comision) > 0 ? ` · comisión ${eur(Number(t.comision), 2)}` : ''}</span>
              </div>
              <DeleteTxButton id={t.id} grouped={!!t.grupo_id} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
