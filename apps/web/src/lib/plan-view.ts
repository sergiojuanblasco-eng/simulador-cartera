import 'server-only';
import type { AssetType, ComputeResult } from '@kartera/core';
import type { PortfolioRow } from '@/lib/db';
import type { UserData } from '@/lib/data';
import { guessProxy, parsePlan } from '@/lib/plan';
import type { ServerSupabase } from '@/lib/supabase/server';

export interface PlanRow {
  assetId: string;
  nombre: string;
  tipo: AssetType;
  isin: string | null;
  /** Valor actual en la cartera (EUR). */
  valor: number;
  pctActual: number;
  /** % objetivo (null = no está en el plan). */
  pctObjetivo: number | null;
  proxy: string;
  proxyAprox: boolean;
  /** Ficha del producto (si se tiene). */
  holdingId: string | null;
}

export interface PlanView {
  rows: PlanRow[];
  total: number;
  tienePlan: boolean;
  /** La base de datos aún no tiene las columnas del plan (migración 0004). */
  sinMigracion: boolean;
  aportacionMensual: number | null;
}

/** Productos de la cartera + su % actual y objetivo. */
export async function planView(supabase: ServerSupabase, data: UserData, result: ComputeResult, p: PortfolioRow): Promise<PlanView> {
  const plan = parsePlan(p.reparto_objetivo);
  const byAsset = new Map<string, { valor: number; holdingId: string; nombre: string; tipo: AssetType; isin: string | null }>();
  for (const h of data.holdings.filter((x) => x.portfolio_id === p.id)) {
    const pos = result.positions.find((x) => x.holdingId === h.id);
    const cur = byAsset.get(h.asset_id);
    const valor = (cur?.valor ?? 0) + (pos?.valor ?? 0);
    byAsset.set(h.asset_id, { valor, holdingId: cur?.holdingId ?? h.id, nombre: h.asset.nombre, tipo: h.asset.tipo, isin: h.asset.isin });
  }
  // Productos del plan que aún no se tienen (se añadieron en el editor)
  const missing = plan.map((x) => x.assetId).filter((id) => !byAsset.has(id));
  const extra = new Map<string, { nombre: string; tipo: AssetType; isin: string | null }>();
  if (missing.length) {
    const { data: rows } = await supabase.from('assets').select('id, nombre, tipo, isin').in('id', missing);
    for (const a of rows ?? []) extra.set(a.id, { nombre: a.nombre, tipo: a.tipo as AssetType, isin: a.isin });
  }

  const total = [...byAsset.values()].reduce((a, x) => a + Math.max(0, x.valor), 0);
  const rows: PlanRow[] = [];
  const push = (assetId: string, info: { nombre: string; tipo: AssetType; isin: string | null }, valor: number, holdingId: string | null) => {
    const item = plan.find((x) => x.assetId === assetId);
    const g = guessProxy(info);
    rows.push({
      assetId, ...info, valor, holdingId,
      pctActual: total > 0 ? Math.max(0, valor) / total : 0,
      pctObjetivo: item ? item.pct : null,
      proxy: item?.proxy ?? g.id,
      proxyAprox: item?.proxy ? false : g.aproximado,
    });
  };
  for (const it of plan) {
    const held = byAsset.get(it.assetId);
    if (held) push(it.assetId, held, held.valor, held.holdingId);
    else if (extra.has(it.assetId)) push(it.assetId, extra.get(it.assetId)!, 0, null);
  }
  for (const [assetId, held] of byAsset) {
    if (!plan.some((x) => x.assetId === assetId) && held.valor > 0.005) push(assetId, held, held.valor, held.holdingId);
  }
  return {
    rows,
    total,
    tienePlan: plan.length > 0,
    sinMigracion: !('reparto_objetivo' in p),
    aportacionMensual: p.aportacion_mensual != null ? Number(p.aportacion_mensual) : null,
  };
}
