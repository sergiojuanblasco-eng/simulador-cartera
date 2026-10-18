import 'server-only';
import type { AssetRow } from '@/lib/db';
import { hoyMadrid } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncAssetPrices } from './ingest';
import { coingeckoLive, eodhdLive } from './providers';

/** Cada cuánto se vuelve a pedir un precio (para no gastar llamadas del proveedor). */
const LIVE_MIN = { cripto: 5, cotizado: 15 };
const DAILY_HOURS = 6;

type Meta = { live_at?: string; sync_at?: string } & Record<string, unknown>;
const ageMin = (iso: string | undefined) => (iso ? (Date.now() - Date.parse(iso)) / 60_000 : Infinity);

/**
 * Actualiza los precios de unos activos:
 *  - cripto: precio en vivo (CoinGecko);
 *  - ETFs y acciones: precio con ~15 min de retraso (EODHD) + cierres diarios que falten;
 *  - fondos: el último valor liquidativo publicado (uno al día).
 * El precio en vivo se guarda como el precio de hoy; el cierre oficial lo sustituye por la noche.
 */
export async function refreshPrices(assetIds: string[], opts: { force?: boolean } = {}): Promise<{ actualizados: number; errores: string[] }> {
  const ids = [...new Set(assetIds)].slice(0, 200);
  if (ids.length === 0) return { actualizados: 0, errores: [] };
  const admin = createAdminClient();
  const { data } = await admin.from('assets').select('*').in('id', ids);
  const assets = ((data ?? []) as AssetRow[]).filter((a) => a.proveedor_id && (a.proveedor === 'eodhd' || a.proveedor === 'coingecko'));
  const today = hoyMadrid();
  const now = new Date().toISOString();
  const rows: { asset_id: string; fecha: string; precio: number; fuente: string }[] = [];
  const touched = new Map<string, Meta>();
  const errores: string[] = [];
  const meta = (a: AssetRow) => touched.get(a.id) ?? { ...(a.metadata as Meta) };

  // Cripto: una sola llamada para todas
  const crypto = assets.filter((a) => a.proveedor === 'coingecko' && (opts.force || ageMin((a.metadata as Meta).live_at) >= LIVE_MIN.cripto));
  if (crypto.length) {
    try {
      const px = await coingeckoLive(crypto.map((a) => a.proveedor_id!));
      for (const a of crypto) {
        const p = px.get(a.proveedor_id!);
        if (p) rows.push({ asset_id: a.id, fecha: today, precio: p, fuente: 'live' });
        touched.set(a.id, { ...meta(a), live_at: now });
      }
    } catch (e) {
      errores.push(`Cripto: ${(e as Error).message}`);
    }
  }

  // EODHD: cierres diarios que falten (fondos y cotizados)
  const eod = assets.filter((a) => a.proveedor === 'eodhd');
  for (const a of eod) {
    if (!opts.force && ageMin((a.metadata as Meta).sync_at) < DAILY_HOURS * 60) continue;
    try {
      await syncAssetPrices(a);
      touched.set(a.id, { ...meta(a), sync_at: now });
    } catch (e) {
      errores.push(`${a.nombre}: ${(e as Error).message}`);
    }
  }

  // EODHD: precio en vivo de ETFs y acciones (los fondos EUFUND no tienen)
  const listed = eod.filter((a) => !a.proveedor_id!.endsWith('.EUFUND') && (opts.force || ageMin((a.metadata as Meta).live_at) >= LIVE_MIN.cotizado));
  if (listed.length) {
    try {
      const px = await eodhdLive(listed.map((a) => a.proveedor_id!));
      for (const a of listed) {
        const p = px.get(a.proveedor_id!);
        if (p) rows.push({ asset_id: a.id, fecha: today, precio: p.precio, fuente: 'live' });
        touched.set(a.id, { ...meta(a), live_at: now });
      }
    } catch (e) {
      errores.push(`Precios en vivo: ${(e as Error).message}`);
    }
  }

  if (rows.length) {
    const { error } = await admin.from('asset_prices').upsert(rows, { onConflict: 'asset_id,fecha' });
    if (error) errores.push(error.message);
  }
  for (const [id, m] of touched) await admin.from('assets').update({ metadata: m }).eq('id', id);
  return { actualizados: rows.length + [...touched.values()].filter((m) => m.sync_at === now).length, errores };
}
