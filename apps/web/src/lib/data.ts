import 'server-only';
import { claseOf } from '@/lib/asset-class';
import { effectiveTer } from '@/lib/market/ter-catalog';
import {
  addDays, computePortfolio, type ComputeInput, type ComputeResult, type CoreHolding, type PricePoint,
} from '@kartera/core';
import { isValorAnotado, type AccountRow, type HoldingRow, type PortfolioRow, type TxRow, type ValuationRow } from '@/lib/db';
import { hoyMadrid } from '@/lib/format';
import type { ServerSupabase } from '@/lib/supabase/server';

const PAGE = 1000; // Límite de filas por petición de Supabase

/**
 * Pide todas las filas paginando (Supabase devuelve como máximo 1000 por consulta).
 * La primera página trae el total y el resto se piden a la vez.
 */
export async function fetchAll<T>(
  query: (from: number, to: number, count: boolean) => PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }>,
): Promise<T[]> {
  const first = await query(0, PAGE - 1, true);
  if (first.error) throw new Error(first.error.message);
  const out = [...((first.data ?? []) as T[])];
  if (out.length < PAGE) return out;
  if (first.count == null) {
    // Sin total: seguir página a página
    for (let from = PAGE; ; from += PAGE) {
      const r = await query(from, from + PAGE - 1, false);
      if (r.error) throw new Error(r.error.message);
      const rows = (r.data ?? []) as T[];
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  }
  const total = first.count;
  if (out.length >= total) return out;
  const pages: number[] = [];
  for (let from = PAGE; from < total; from += PAGE) pages.push(from);
  const rest = await Promise.all(pages.map((from) => query(from, from + PAGE - 1, false)));
  for (const r of rest) {
    if (r.error) throw new Error(r.error.message);
    out.push(...((r.data ?? []) as T[]));
  }
  return out;
}

export interface UserData {
  portfolios: PortfolioRow[];
  accounts: AccountRow[];
  holdings: HoldingRow[];
  txs: TxRow[];
  /** Valores anotados a mano, por posición. */
  valuations: Record<string, ValuationRow[]>;
  /** false si falta la migración 0007 (saldos anotados). */
  saldosListos: boolean;
  prices: Record<string, PricePoint[]>;
  fx: Record<string, PricePoint[]>;
  today: string;
}

/** Carga todos los datos del usuario (RLS garantiza que solo son suyos). */
export async function loadUserData(supabase: ServerSupabase): Promise<UserData> {
  const today = hoyMadrid();
  // Tanda 1 (a la vez): carteras, cuentas, posiciones, operaciones y saldos anotados
  const [pRes, aRes, hRes, txs, vRes] = await Promise.all([
    // '*': así funciona antes y después de las migraciones nuevas
    supabase.from('portfolios').select('*').order('orden').order('created_at'),
    supabase.from('accounts').select('id, nombre, entidad').order('nombre'),
    supabase.from('holdings').select('*, asset:assets (*)'),
    fetchAll<TxRow>((from, to, count) =>
      supabase.from('transactions')
        .select('id, holding_id, tipo, fecha, cantidad, precio, importe, comision, moneda, fx_eur, grupo_id, notas, created_at', count ? { count: 'exact' } : undefined)
        .order('fecha').order('id').range(from, to)),
    fetchAll<ValuationRow>((from, to, count) =>
      supabase.from('valuations').select('id, holding_id, fecha, valor, aportado, notas', count ? { count: 'exact' } : undefined)
        .order('fecha').order('id').range(from, to))
      .then((rows) => ({ rows, ok: true }), () => ({ rows: [] as ValuationRow[], ok: false })),
  ]);
  for (const r of [pRes, aRes, hRes]) if (r.error) throw new Error(r.error.message);
  const valuations: Record<string, ValuationRow[]> = {};
  for (const v of vRes.rows) (valuations[v.holding_id] ??= []).push(v);

  const holdings = (hRes.data ?? []) as unknown as HoldingRow[];
  const assetIds = [...new Set(holdings.map((h) => h.asset_id))];
  const firstVal = vRes.rows[0]?.fecha;
  const first = [txs[0]?.fecha, firstVal].filter((x): x is string => !!x).sort()[0];
  const minDate = first ? addDays(first, -10) : today;
  const currencies = [...new Set(holdings.map((h) => h.asset.moneda.toUpperCase()).filter((c) => c !== 'EUR'))];

  // Tanda 2 (a la vez): precios y tipos de cambio
  const [priceRows, fxRows] = await Promise.all([
    assetIds.length
      ? fetchAll<{ asset_id: string; fecha: string; precio: string }>((from, to, count) =>
        supabase.from('asset_prices').select('asset_id, fecha, precio', count ? { count: 'exact' } : undefined)
          .in('asset_id', assetIds).gte('fecha', minDate)
          .order('asset_id').order('fecha').range(from, to))
      : Promise.resolve([]),
    currencies.length
      ? fetchAll<{ moneda: string; fecha: string; tipo_vs_eur: string }>((from, to, count) =>
        supabase.from('fx_rates').select('moneda, fecha, tipo_vs_eur', count ? { count: 'exact' } : undefined)
          .in('moneda', currencies).gte('fecha', minDate)
          .order('moneda').order('fecha').range(from, to))
      : Promise.resolve([]),
  ]);
  const prices: Record<string, PricePoint[]> = {};
  for (const r of priceRows) (prices[r.asset_id] ??= []).push({ fecha: r.fecha, precio: r.precio });
  const fx: Record<string, PricePoint[]> = {};
  for (const r of fxRows) (fx[r.moneda] ??= []).push({ fecha: r.fecha, precio: r.tipo_vs_eur });

  return {
    portfolios: (pRes.data ?? []) as PortfolioRow[],
    accounts: (aRes.data ?? []) as AccountRow[],
    holdings,
    txs,
    valuations,
    saldosListos: vRes.ok,
    prices,
    fx,
    today,
  };
}

export function toCoreHoldings(data: UserData): CoreHolding[] {
  return data.holdings.map((h) => ({
    id: h.id,
    assetId: h.asset_id,
    portfolioId: h.portfolio_id,
    accountId: h.account_id,
    nombre: h.asset.nombre,
    tipo: h.asset.tipo,
    moneda: h.asset.moneda,
    ter: effectiveTer(h.ter, h.asset),
    comisionFija: h.comision_fija != null ? Number(h.comision_fija) : null,
    clase: claseOf(h.clase, h.asset),
    manual: isValorAnotado(h.asset),
  }));
}

export function toCoreInput(data: UserData, portfolioId?: string | null): ComputeInput {
  const holdings = toCoreHoldings(data);
  return {
    holdings,
    txs: data.txs.map((t) => ({
      id: t.id,
      holdingId: t.holding_id,
      tipo: t.tipo,
      fecha: t.fecha,
      cantidad: t.cantidad,
      importe: t.importe,
      comision: t.comision,
      fxEur: t.fx_eur,
      grupoId: t.grupo_id,
    })),
    prices: data.prices,
    fx: data.fx,
    today: data.today,
    valuations: Object.fromEntries(Object.entries(data.valuations).map(([hid, rows]) =>
      [hid, rows.map((v) => ({ fecha: v.fecha, valor: v.valor, aportado: v.aportado }))])),
    scope: portfolioId ? holdings.filter((h) => h.portfolioId === portfolioId).map((h) => h.id) : undefined,
  };
}

/** Resultados ya calculados para estos datos (una misma página no recalcula lo mismo dos veces). */
const memo = new WeakMap<UserData, Map<string, ComputeResult>>();

/**
 * Calcula una cartera (o todo). Con `soloMercado` deja fuera lo anotado a mano (cuentas, planes,
 * depósitos): es lo que se compara con el índice.
 *
 * La rentabilidad (TIR, caída máxima, rentabilidad por año y % de ganancia) se mide sobre lo
 * invertido: una cuenta del banco, o un producto anotado sin saber lo aportado, no «rinde» y solo
 * la diluiría. El valor, lo aportado y la ganancia en euros sí incluyen todo.
 */
export function compute(data: UserData, portfolioId?: string | null, opts: { soloMercado?: boolean } = {}): ComputeResult {
  let byKey = memo.get(data);
  if (!byKey) { byKey = new Map(); memo.set(data, byKey); }
  const key = (portfolioId ?? '*') + (opts.soloMercado ? ':mercado' : '');
  let r = byKey.get(key);
  if (r) return r;

  const input = toCoreInput(data, portfolioId);
  const scope = input.scope ? [...input.scope] : input.holdings.map((h) => h.id);
  const manual = new Set(input.holdings.filter((h) => h.manual).map((h) => h.id));
  if (opts.soloMercado) {
    r = computePortfolio({ ...input, scope: scope.filter((id) => !manual.has(id)) });
  } else {
    r = computePortfolio(input);
    const sinRentabilidad = scope.filter((id) => manual.has(id) && !(data.valuations[id] ?? []).some((v) => v.aportado !== null));
    if (sinRentabilidad.length) {
      const fuera = new Set(sinRentabilidad);
      const inv = computePortfolio({ ...input, scope: scope.filter((id) => !fuera.has(id)) });
      r = {
        ...r,
        metrics: {
          ...r.metrics,
          tir: inv.metrics.tir,
          maxDrawdown: inv.metrics.maxDrawdown,
          rentabilidadAnual: inv.metrics.rentabilidadAnual,
          gananciaPct: inv.metrics.aportado > 0 ? r.metrics.ganancia / inv.metrics.aportado : null,
        },
      };
    }
  }
  byKey.set(key, r);
  return r;
}

export function labelMaps(data: UserData) {
  return {
    carteras: Object.fromEntries(data.portfolios.map((p) => [p.id, p.nombre])),
    cuentas: Object.fromEntries(data.accounts.map((a) => [a.id, a.nombre])),
  };
}
