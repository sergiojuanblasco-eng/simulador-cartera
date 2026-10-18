import 'server-only';
import { rebalanceGap, type AssetType, type ComputeResult } from '@kartera/core';
import type { PortfolioRow } from '@/lib/db';
import { compute, type UserData } from '@/lib/data';
import { claseOf } from '@/lib/asset-class';
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
  /** Clase de activo (renta variable, renta fija…). */
  clase: string;
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
  const byAsset = new Map<string, { valor: number; holdingId: string; nombre: string; tipo: AssetType; isin: string | null; clase: string }>();
  for (const h of data.holdings.filter((x) => x.portfolio_id === p.id)) {
    const pos = result.positions.find((x) => x.holdingId === h.id);
    const cur = byAsset.get(h.asset_id);
    const valor = (cur?.valor ?? 0) + (pos?.valor ?? 0);
    byAsset.set(h.asset_id, { valor, holdingId: cur?.holdingId ?? h.id, nombre: h.asset.nombre, tipo: h.asset.tipo, isin: h.asset.isin, clase: claseOf(h.clase, h.asset) });
  }
  // Productos del plan que aún no se tienen (se añadieron en el editor)
  const missing = plan.map((x) => x.assetId).filter((id) => !byAsset.has(id));
  const extra = new Map<string, { nombre: string; tipo: AssetType; isin: string | null; clase: string }>();
  if (missing.length) {
    const { data: rows } = await supabase.from('assets').select('id, nombre, tipo, isin').in('id', missing);
    for (const a of rows ?? []) {
      const info = { nombre: a.nombre as string, tipo: a.tipo as AssetType, isin: a.isin as string | null };
      extra.set(a.id, { ...info, clase: claseOf(null, info) });
    }
  }

  const total = [...byAsset.values()].reduce((a, x) => a + Math.max(0, x.valor), 0);
  const rows: PlanRow[] = [];
  const push = (assetId: string, info: { nombre: string; tipo: AssetType; isin: string | null; clase: string }, valor: number, holdingId: string | null) => {
    const item = plan.find((x) => x.assetId === assetId);
    const g = guessProxy(info);
    rows.push({
      assetId, nombre: info.nombre, tipo: info.tipo, isin: info.isin, clase: info.clase, valor, holdingId,
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

export interface TargetLine {
  assetId: string;
  nombre: string;
  clase: string;
  holdingId: string | null;
  valor: number;
  pctActual: number;
  pctObjetivo: number;
  /** + añadir / − retirar (EUR) para estar exactamente en el objetivo. */
  ajuste: number;
}

export interface TargetSummary {
  portfolioId: string;
  nombre: string;
  objetivo: PortfolioRow['objetivo'];
  tienePlan: boolean;
  valor: number;
  /** Lo que piensas aportar al mes (plan) o tu media si aún no lo has dicho. */
  mensual: number;
  mensualDelPlan: boolean;
  /** Productos del objetivo: % real frente a objetivo y cuánto añadir o retirar. */
  lines: TargetLine[];
  /** Productos que tienes pero no están en el objetivo (no cuentan para el reparto). */
  fuera: { nombre: string; valor: number }[];
}

/** Cartera objetivo frente a la real: por producto, % y euros para cuadrar. */
export async function targetSummary(supabase: ServerSupabase, data: UserData, p: PortfolioRow, result?: ComputeResult): Promise<TargetSummary> {
  const r = result ?? compute(data, p.id);
  const view = await planView(supabase, data, r, p);
  const planRows = view.rows.filter((x) => x.pctObjetivo !== null);
  const gap = rebalanceGap(planRows.map((x) => ({ key: x.assetId, peso: x.pctObjetivo!, actual: x.valor })));
  return {
    portfolioId: p.id, nombre: p.nombre, objetivo: p.objetivo, tienePlan: view.tienePlan, valor: r.metrics.valor,
    mensual: view.aportacionMensual ?? Math.round(r.metrics.aportacionMediaMensual),
    mensualDelPlan: view.aportacionMensual !== null,
    lines: planRows.map((x, i) => ({
      assetId: x.assetId, nombre: x.nombre, clase: x.clase, holdingId: x.holdingId, valor: x.valor,
      pctActual: gap[i]!.pesoActual, pctObjetivo: gap[i]!.pesoObjetivo, ajuste: gap[i]!.ajuste,
    })),
    fuera: view.rows.filter((x) => x.pctObjetivo === null).map((x) => ({ nombre: x.nombre, valor: x.valor })),
  };
}
