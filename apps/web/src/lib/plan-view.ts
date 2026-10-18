import 'server-only';
import { splitContribution, type AssetType, type ComputeResult } from '@kartera/core';
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

export interface MonthlyPlan {
  portfolioId: string;
  nombre: string;
  objetivo: PortfolioRow['objetivo'];
  tienePlan: boolean;
  valor: number;
  /** Lo que piensas aportar al mes (plan) o tu media si aún no lo has dicho. */
  mensual: number;
  mensualDelPlan: boolean;
  /** Dinero nuevo que ya has metido este mes en esta cartera. */
  aportadoMes: number;
  restante: number;
  /** Cuánto poner en cada producto (equilibrando hacia el objetivo). */
  lines: { assetId: string; nombre: string; importe: number }[];
}

/** Lo que te toca aportar este mes en una cartera y cómo repartirlo. */
export async function monthlyPlan(supabase: ServerSupabase, data: UserData, p: PortfolioRow, result?: ComputeResult): Promise<MonthlyPlan> {
  const r = result ?? compute(data, p.id);
  const view = await planView(supabase, data, r, p);
  const mensual = view.aportacionMensual ?? Math.round(r.metrics.aportacionMediaMensual);
  const aportadoMes = Math.max(0, Math.round(r.metrics.mesActual.aportado));
  const restante = Math.max(0, Math.round(mensual - aportadoMes));
  const planRows = view.rows.filter((x) => x.pctObjetivo !== null);
  const lines = view.tienePlan && restante > 0
    ? splitContribution(restante, planRows.map((x) => ({ key: x.assetId, peso: x.pctObjetivo!, actual: x.valor })), 'equilibrar')
      .map((l) => ({ assetId: l.key, nombre: planRows.find((x) => x.assetId === l.key)!.nombre, importe: l.importe }))
    : [];
  return {
    portfolioId: p.id, nombre: p.nombre, objetivo: p.objetivo, tienePlan: view.tienePlan, valor: r.metrics.valor,
    mensual, mensualDelPlan: view.aportacionMensual !== null, aportadoMes, restante, lines,
  };
}
