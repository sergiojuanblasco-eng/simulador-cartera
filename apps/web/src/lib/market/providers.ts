import 'server-only';
import type { AssetType } from '@kartera/core';
import { serverEnv } from '@/lib/env';

/**
 * Proveedores de datos de mercado.
 *  - EODHD: fondos, ETFs y acciones (búsqueda por ISIN/nombre y cierres diarios).
 *  - CoinGecko: cripto (gratis, histórico de 365 días en el plan gratuito).
 *  - Frankfurter: tipos de cambio oficiales del BCE (gratis).
 */

export interface ExternalAsset {
  proveedor: 'eodhd' | 'coingecko';
  proveedorId: string;
  nombre: string;
  isin: string | null;
  ticker: string | null;
  tipo: AssetType;
  moneda: string;
  detalle: string;
}

const TIMEOUT = 12_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).host}`);
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------- EODHD
const EODHD = 'https://eodhd.com/api';

function eodhdType(t: string): AssetType {
  const s = t.toLowerCase();
  if (s.includes('fund')) return 'fondo';
  if (s.includes('etf')) return 'etf';
  if (s.includes('stock') || s.includes('share')) return 'accion';
  return 'otro';
}

export async function eodhdSearch(q: string): Promise<ExternalAsset[]> {
  const key = serverEnv.eodhdKey();
  if (!key) return [];
  type Row = { Code: string; Exchange: string; Name: string; Type: string; Country: string; Currency: string; ISIN: string | null };
  const rows = await getJson<Row[]>(`${EODHD}/search/${encodeURIComponent(q)}?api_token=${key}&fmt=json&limit=15`);
  return rows.map((r) => ({
    proveedor: 'eodhd' as const,
    proveedorId: `${r.Code}.${r.Exchange}`,
    nombre: r.Name,
    isin: r.ISIN && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(r.ISIN) ? r.ISIN : null,
    ticker: r.Code,
    tipo: eodhdType(r.Type),
    moneda: (r.Currency || 'EUR').toUpperCase().slice(0, 3),
    detalle: [r.Type, r.Exchange, r.Currency].filter(Boolean).join(' · '),
  }));
}

export async function eodhdPrices(symbol: string, from: string): Promise<{ fecha: string; precio: number }[]> {
  const key = serverEnv.eodhdKey();
  if (!key) return [];
  type Row = { date: string; close: number };
  const rows = await getJson<Row[]>(`${EODHD}/eod/${encodeURIComponent(symbol)}?api_token=${key}&fmt=json&period=d&from=${from}`);
  return rows.filter((r) => r.close > 0).map((r) => ({ fecha: r.date, precio: r.close }));
}

/** TER desde la ficha del fondo/ETF (si el plan de EODHD lo incluye). Devuelve fracción o null. */
export async function eodhdTer(symbol: string): Promise<number | null> {
  const key = serverEnv.eodhdKey();
  if (!key) return null;
  for (const filter of ['ETF_Data::NetExpenseRatio', 'MutualFund_Data::Expense_Ratio']) {
    try {
      const v = await getJson<unknown>(`${EODHD}/fundamentals/${encodeURIComponent(symbol)}?api_token=${key}&filter=${filter}`);
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n > 0.2 ? n / 100 : n;
    } catch {
      // Sin datos de fundamentales en el plan: se puede indicar a mano.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------- CoinGecko
const CG = 'https://api.coingecko.com/api/v3';

export async function coingeckoSearch(q: string): Promise<ExternalAsset[]> {
  type Res = { coins: { id: string; name: string; symbol: string; market_cap_rank: number | null }[] };
  const res = await getJson<Res>(`${CG}/search?query=${encodeURIComponent(q)}`);
  return res.coins.slice(0, 6).map((c) => ({
    proveedor: 'coingecko' as const,
    proveedorId: c.id,
    nombre: c.name,
    isin: null,
    ticker: c.symbol.toUpperCase(),
    tipo: 'cripto' as const,
    moneda: 'EUR',
    detalle: `Cripto · ${c.symbol.toUpperCase()}`,
  }));
}

export async function coingeckoPrices(id: string, days: number): Promise<{ fecha: string; precio: number }[]> {
  type Res = { prices: [number, number][] };
  const d = Math.max(1, Math.min(365, Math.ceil(days)));
  const res = await getJson<Res>(`${CG}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=eur&days=${d}&interval=daily`);
  const byDay = new Map<string, number>();
  for (const [ms, p] of res.prices) if (p > 0) byDay.set(new Date(ms).toISOString().slice(0, 10), p);
  return [...byDay.entries()].map(([fecha, precio]) => ({ fecha, precio }));
}

// ---------------------------------------------------------------------------- BCE (Frankfurter)
export async function ecbRates(currencies: string[], from: string): Promise<{ fecha: string; moneda: string; tipo: number }[]> {
  if (currencies.length === 0) return [];
  type Res = { rates: Record<string, Record<string, number>> };
  const res = await getJson<Res>(`https://api.frankfurter.app/${from}..?from=EUR&to=${currencies.join(',')}`);
  const out: { fecha: string; moneda: string; tipo: number }[] = [];
  for (const [fecha, rates] of Object.entries(res.rates ?? {})) {
    for (const [moneda, tipo] of Object.entries(rates)) out.push({ fecha, moneda, tipo });
  }
  return out;
}

// ---------------------------------------------------------------------------- Precios en vivo
/**
 * Último precio (con ~15 min de retraso) de ETFs y acciones en EODHD. Hasta 15 símbolos por llamada.
 * Los fondos (EUFUND) no tienen precio en vivo: publican un valor liquidativo al día.
 */
export async function eodhdLive(symbols: string[]): Promise<Map<string, { precio: number; ts: number }>> {
  const out = new Map<string, { precio: number; ts: number }>();
  const key = serverEnv.eodhdKey();
  if (!key || symbols.length === 0) return out;
  type Row = { code: string; timestamp: number | 'NA'; close: number | 'NA'; previousClose?: number | 'NA' };
  for (let i = 0; i < symbols.length; i += 15) {
    const [first, ...rest] = symbols.slice(i, i + 15);
    const extra = rest.length ? `&s=${rest.map(encodeURIComponent).join(',')}` : '';
    const res = await getJson<Row | Row[]>(`${EODHD}/real-time/${encodeURIComponent(first!)}?api_token=${key}&fmt=json${extra}`);
    for (const r of Array.isArray(res) ? res : [res]) {
      const precio = typeof r.close === 'number' && r.close > 0 ? r.close : typeof r.previousClose === 'number' && r.previousClose > 0 ? r.previousClose : null;
      if (precio) out.set(r.code, { precio, ts: typeof r.timestamp === 'number' ? r.timestamp * 1000 : Date.now() });
    }
  }
  return out;
}

/** Precio actual en euros de varias cripto (CoinGecko, gratis). */
export async function coingeckoLive(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (ids.length === 0) return out;
  const res = await getJson<Record<string, { eur?: number }>>(`${CG}/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=eur`);
  for (const [id, v] of Object.entries(res)) if (v.eur && v.eur > 0) out.set(id, v.eur);
  return out;
}
