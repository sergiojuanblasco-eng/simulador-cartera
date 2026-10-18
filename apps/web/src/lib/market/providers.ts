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
  proveedor: 'eodhd' | 'coingecko' | 'yahoo';
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

// ---------------------------------------------------------------------------- Yahoo Finance (gratis, no oficial)
/**
 * API pública no oficial de Yahoo Finance: gratis y sin clave. Tiene ETFs y acciones de las bolsas
 * europeas y la mayoría de fondos europeos (tickers «0P…» con el valor liquidativo diario de Morningstar).
 * Puede cambiar o limitar peticiones sin aviso: por eso se usa con moderación y con EODHD como alternativa.
 */
const YH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

async function yahooJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: YH_HEADERS, signal: AbortSignal.timeout(TIMEOUT), cache: 'no-store' });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Mercados en euros (preferidos para un inversor español). */
const EUR_SUFFIX = ['.DE', '.AS', '.PA', '.MI', '.MC', '.F', '.SG', '.BE', '.DU', '.MU', '.HM', '.VI', '.BR', '.LS', '.HE', '.IR'];

function yahooTipo(q: string | undefined): AssetType {
  switch (q) {
    case 'ETF': return 'etf';
    case 'MUTUALFUND': return 'fondo';
    case 'EQUITY': return 'accion';
    case 'CRYPTOCURRENCY': return 'cripto';
    default: return 'otro';
  }
}

export async function yahooSearch(q: string): Promise<ExternalAsset[]> {
  type Q = { symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchDisp?: string; typeDisp?: string };
  const res = await yahooJson<{ quotes?: Q[] }>(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`,
  );
  const isin = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(q.trim().toUpperCase()) ? q.trim().toUpperCase() : null;
  return (res.quotes ?? [])
    .filter((x): x is Q & { symbol: string } => !!x.symbol && ['ETF', 'MUTUALFUND', 'EQUITY'].includes(x.quoteType ?? ''))
    .map((x) => ({
      proveedor: 'yahoo' as const,
      proveedorId: x.symbol,
      nombre: x.longname || x.shortname || x.symbol,
      isin,
      ticker: x.symbol,
      tipo: yahooTipo(x.quoteType),
      moneda: 'EUR', // la moneda real se lee del gráfico al darlo de alta
      detalle: [x.typeDisp, x.exchDisp, x.symbol].filter(Boolean).join(' · '),
    }));
}

/** El mejor resultado para un inversor en euros: fondo si lo hay; si no, la cotización en un mercado en euros. */
export function pickYahoo(results: ExternalAsset[]): ExternalAsset | null {
  const score = (r: ExternalAsset) =>
    (r.tipo === 'fondo' ? 4 : 0) + (EUR_SUFFIX.some((s) => r.proveedorId.endsWith(s)) ? 3 : 0) + (r.proveedorId.endsWith('.DE') ? 1 : 0)
    - (/\.(L|SW|TO|AX)$/.test(r.proveedorId) ? 3 : 0);
  return [...results].sort((a, b) => score(b) - score(a))[0] ?? null;
}

export interface YahooChart {
  currency: string;
  points: { fecha: string; precio: number }[];
  last: { precio: number; ts: number } | null;
}

/** Cierres diarios desde `from` (y el último precio) de un símbolo de Yahoo. Corrige peniques (GBp → GBP). */
export async function yahooChart(symbol: string, from?: string): Promise<YahooChart> {
  const p1 = Math.floor((from ? Date.parse(from + 'T00:00:00Z') : Date.now() - 5 * 365 * 86_400_000) / 1000);
  const p2 = Math.floor(Date.now() / 1000) + 86_400;
  type R = {
    chart: { result?: { meta: { currency?: string; regularMarketPrice?: number; regularMarketTime?: number; gmtoffset?: number }; timestamp?: number[];
      indicators: { quote: { close?: (number | null)[] }[] } }[] | null; error?: { description?: string } | null };
  };
  const res = await yahooJson<R>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d&includePrePost=false`);
  const r = res.chart.result?.[0];
  if (!r) throw new Error(res.chart.error?.description || 'Yahoo: sin datos');
  const pence = r.meta.currency === 'GBp' || r.meta.currency === 'GBX';
  const k = pence ? 0.01 : 1;
  const off = r.meta.gmtoffset ?? 0;
  const closes = r.indicators.quote[0]?.close ?? [];
  const byDay = new Map<string, number>();
  (r.timestamp ?? []).forEach((t, i) => {
    const c = closes[i];
    if (typeof c === 'number' && c > 0) byDay.set(new Date((t + off) * 1000).toISOString().slice(0, 10), c * k);
  });
  const lastPx = r.meta.regularMarketPrice;
  return {
    currency: pence ? 'GBP' : (r.meta.currency || 'EUR').toUpperCase(),
    points: [...byDay.entries()].map(([fecha, precio]) => ({ fecha, precio })),
    last: typeof lastPx === 'number' && lastPx > 0 ? { precio: lastPx * k, ts: (r.meta.regularMarketTime ?? Date.now() / 1000) * 1000 } : null,
  };
}
