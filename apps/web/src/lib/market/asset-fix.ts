import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { detectCrypto, type CryptoHint } from '@/lib/crypto';
import type { AssetRow } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { coingeckoSearch, eodhdSearch, type ExternalAsset } from './providers';

/**
 * Arreglos de productos propios (los que se crearon «a mano» porque no se reconocieron):
 *  - una cripto guardada como fondo → se enlaza con su precio de CoinGecko;
 *  - un fondo/ETF con ISIN → se enlaza con EODHD cuando hay clave (precio diario + TER).
 * Enlazar = mover sus posiciones y movimientos al activo del catálogo global y borrar el propio.
 */

/** Activo de CoinGecko para una cripto detectada. */
export async function cryptoTarget(hint: CryptoHint, nombre: string): Promise<ExternalAsset | null> {
  if (hint.coingeckoId) {
    return {
      proveedor: 'coingecko', proveedorId: hint.coingeckoId, nombre: nombre || hint.symbol, isin: null,
      ticker: hint.symbol, tipo: 'cripto', moneda: 'EUR', detalle: `Cripto · ${hint.symbol}`,
    };
  }
  try {
    const found = await coingeckoSearch(hint.symbol);
    return found.find((c) => c.ticker === hint.symbol) ?? null;
  } catch {
    return null;
  }
}

/** Mejor cotización en EODHD para un ISIN (prefiere EUR y el propio ISIN). */
export async function eodhdTarget(isin: string): Promise<ExternalAsset | null> {
  if (!serverEnv.eodhdKey()) return null;
  try {
    const rows = (await eodhdSearch(isin)).filter((r) => !r.isin || r.isin === isin);
    const score = (r: ExternalAsset) =>
      (r.isin === isin ? 4 : 0) + (r.moneda === 'EUR' ? 2 : 0) + (/\.(EUFUND|XETRA|AS|MC|PA|MI)$/.test(r.proveedorId) ? 1 : 0);
    return rows.sort((a, b) => score(b) - score(a))[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Mueve todo lo del activo propio `fromId` al activo `toId` y borra el propio.
 * Si en la misma cartera y bróker ya había una posición del destino, se juntan.
 * Devuelve, por cada posición antigua, la posición en la que ha quedado.
 */
export async function relinkAsset(db: SupabaseClient, fromId: string, toId: string): Promise<Map<string, string>> {
  const moved = new Map<string, string>();
  const { data: hs, error } = await db.from('holdings').select('id, user_id, portfolio_id, account_id').eq('asset_id', fromId);
  if (error) throw new Error(error.message);
  for (const h of hs ?? []) {
    const { data: twin } = await db.from('holdings').select('id')
      .eq('portfolio_id', h.portfolio_id).eq('account_id', h.account_id).eq('asset_id', toId).maybeSingle();
    if (twin) {
      const { error: e1 } = await db.from('transactions').update({ holding_id: twin.id }).eq('holding_id', h.id);
      if (e1) throw new Error(e1.message);
      await db.from('holdings').delete().eq('id', h.id);
      moved.set(h.id, twin.id);
    } else {
      const { error: e2 } = await db.from('holdings').update({ asset_id: toId }).eq('id', h.id);
      if (e2) throw new Error(e2.message);
      moved.set(h.id, h.id);
    }
  }
  const { count } = await db.from('holdings').select('id', { count: 'exact', head: true }).eq('asset_id', fromId);
  if (!count) await db.from('assets').delete().eq('id', fromId);
  return moved;
}

/** ¿Este producto propio se puede enlazar con datos de mercado? */
export async function marketTargetFor(a: Pick<AssetRow, 'nombre' | 'isin' | 'ticker' | 'tipo'>): Promise<ExternalAsset | null> {
  const hint = a.tipo === 'cripto'
    ? detectCrypto({ nombre: a.nombre, ticker: a.ticker, isin: a.isin, clase: 'crypto' })
    : detectCrypto({ nombre: a.nombre, ticker: a.ticker, isin: a.isin });
  if (hint) return cryptoTarget(hint, a.nombre);
  if (a.isin && a.tipo !== 'efectivo') return eodhdTarget(a.isin);
  return null;
}
