import 'server-only';
import {
  addDays, computePortfolio, type ComputeInput, type ComputeResult, type CoreHolding, type PricePoint,
} from '@kartera/core';
import type { AccountRow, HoldingRow, PortfolioRow, TxRow } from '@/lib/db';
import { hoyMadrid } from '@/lib/format';
import type { ServerSupabase } from '@/lib/supabase/server';

const PAGE = 1000; // Límite de filas por petición de Supabase

/** Pide todas las filas paginando (Supabase devuelve como máximo 1000 por consulta). */
export async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export interface UserData {
  portfolios: PortfolioRow[];
  accounts: AccountRow[];
  holdings: HoldingRow[];
  txs: TxRow[];
  prices: Record<string, PricePoint[]>;
  fx: Record<string, PricePoint[]>;
  today: string;
}

/** Carga todos los datos del usuario (RLS garantiza que solo son suyos). */
export async function loadUserData(supabase: ServerSupabase): Promise<UserData> {
  const today = hoyMadrid();
  const [pRes, aRes, hRes, txs] = await Promise.all([
    supabase.from('portfolios').select('id, nombre, objetivo, objetivo_importe, objetivo_anio, color, orden, archivada').order('orden').order('created_at'),
    supabase.from('accounts').select('id, nombre, entidad').order('nombre'),
    supabase.from('holdings').select('id, portfolio_id, account_id, asset_id, asset:assets (*)'),
    fetchAll<TxRow>((from, to) =>
      supabase.from('transactions')
        .select('id, holding_id, tipo, fecha, cantidad, precio, importe, comision, moneda, fx_eur, grupo_id, notas, created_at')
        .order('fecha').order('id').range(from, to)),
  ]);
  for (const r of [pRes, aRes, hRes]) if (r.error) throw new Error(r.error.message);

  const holdings = (hRes.data ?? []) as unknown as HoldingRow[];
  const assetIds = [...new Set(holdings.map((h) => h.asset_id))];
  const minDate = txs.length ? addDays(txs[0]!.fecha, -10) : today;

  const prices: Record<string, PricePoint[]> = {};
  if (assetIds.length) {
    const rows = await fetchAll<{ asset_id: string; fecha: string; precio: string }>((from, to) =>
      supabase.from('asset_prices').select('asset_id, fecha, precio')
        .in('asset_id', assetIds).gte('fecha', minDate)
        .order('asset_id').order('fecha').range(from, to));
    for (const r of rows) (prices[r.asset_id] ??= []).push({ fecha: r.fecha, precio: r.precio });
  }

  const currencies = [...new Set(holdings.map((h) => h.asset.moneda.toUpperCase()).filter((c) => c !== 'EUR'))];
  const fx: Record<string, PricePoint[]> = {};
  if (currencies.length) {
    const rows = await fetchAll<{ moneda: string; fecha: string; tipo_vs_eur: string }>((from, to) =>
      supabase.from('fx_rates').select('moneda, fecha, tipo_vs_eur')
        .in('moneda', currencies).gte('fecha', minDate)
        .order('moneda').order('fecha').range(from, to));
    for (const r of rows) (fx[r.moneda] ??= []).push({ fecha: r.fecha, precio: r.tipo_vs_eur });
  }

  return {
    portfolios: (pRes.data ?? []) as PortfolioRow[],
    accounts: (aRes.data ?? []) as AccountRow[],
    holdings,
    txs,
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
    ter: h.asset.ter === null ? null : Number(h.asset.ter),
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
    scope: portfolioId ? holdings.filter((h) => h.portfolioId === portfolioId).map((h) => h.id) : undefined,
  };
}

export function compute(data: UserData, portfolioId?: string | null): ComputeResult {
  return computePortfolio(toCoreInput(data, portfolioId));
}

export function labelMaps(data: UserData) {
  return {
    carteras: Object.fromEntries(data.portfolios.map((p) => [p.id, p.nombre])),
    cuentas: Object.fromEntries(data.accounts.map((a) => [a.id, a.nombre])),
  };
}
