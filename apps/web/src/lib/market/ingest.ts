import 'server-only';
import { addDays, daysBetween } from '@kartera/core';
import type { AssetRow } from '@/lib/db';
import { serverEnv } from '@/lib/env';
import { hoyMadrid } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { marketTargetFor, relinkAsset } from './asset-fix';
import { coingeckoPrices, ecbRates, eodhdPrices, eodhdTer, type ExternalAsset } from './providers';

type Admin = ReturnType<typeof createAdminClient>;

const DEFAULT_HISTORY_DAYS = 365 * 5;

async function upsertChunks(admin: Admin, table: string, rows: Record<string, unknown>[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

/**
 * Descarga y guarda los precios que falten de un activo, desde `from`
 * (o desde el último precio guardado). Idempotente: se puede repetir sin duplicar.
 */
export async function syncAssetPrices(asset: Pick<AssetRow, 'id' | 'proveedor' | 'proveedor_id'>, from?: string): Promise<number> {
  if (!asset.proveedor_id || (asset.proveedor !== 'eodhd' && asset.proveedor !== 'coingecko')) return 0;
  const admin = createAdminClient();
  const today = hoyMadrid();

  const { data: last } = await admin.from('asset_prices').select('fecha')
    .eq('asset_id', asset.id).order('fecha', { ascending: false }).limit(1).maybeSingle();
  const { data: first } = await admin.from('asset_prices').select('fecha')
    .eq('asset_id', asset.id).order('fecha', { ascending: true }).limit(1).maybeSingle();

  const wanted = from ?? addDays(today, -DEFAULT_HISTORY_DAYS);
  // Si ya tenemos histórico desde antes de lo que se pide, solo bajamos lo nuevo.
  const start = first && first.fecha <= wanted && last ? addDays(last.fecha, 1) : wanted;
  if (start > today) return 0;

  const points = asset.proveedor === 'eodhd'
    ? await eodhdPrices(asset.proveedor_id, start)
    : await coingeckoPrices(asset.proveedor_id, daysBetween(start, today) + 1);

  const rows = points
    .filter((p) => p.fecha >= start && p.fecha <= today)
    .map((p) => ({ asset_id: asset.id, fecha: p.fecha, precio: p.precio, fuente: asset.proveedor }));
  await upsertChunks(admin, 'asset_prices', rows, 'asset_id,fecha');
  return rows.length;
}

/** Da de alta (o reutiliza) un activo del catálogo global a partir de un resultado de búsqueda. */
export async function ensureGlobalAsset(ext: ExternalAsset): Promise<string> {
  const admin = createAdminClient();
  const { data: byProv } = await admin.from('assets').select('id')
    .is('owner_id', null).eq('proveedor', ext.proveedor).eq('proveedor_id', ext.proveedorId).maybeSingle();
  if (byProv) return byProv.id;
  if (ext.isin) {
    const { data: byIsin } = await admin.from('assets').select('id').is('owner_id', null).eq('isin', ext.isin).maybeSingle();
    if (byIsin) return byIsin.id;
  }
  const ter = ext.proveedor === 'eodhd' && (ext.tipo === 'etf' || ext.tipo === 'fondo') ? await eodhdTer(ext.proveedorId) : null;
  const { data, error } = await admin.from('assets').insert({
    owner_id: null,
    isin: ext.isin,
    ticker: ext.ticker,
    nombre: ext.nombre.slice(0, 200),
    tipo: ext.tipo,
    moneda: ext.moneda,
    ter,
    proveedor: ext.proveedor,
    proveedor_id: ext.proveedorId,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** El índice de referencia del What-if (MSCI World por defecto). */
export async function ensureBenchmark(): Promise<AssetRow | null> {
  const admin = createAdminClient();
  const isin = serverEnv.benchmarkIsin();
  const { data } = await admin.from('assets').select('*').is('owner_id', null).eq('isin', isin).maybeSingle();
  if (data) return data as AssetRow;
  if (!serverEnv.eodhdKey()) return null;
  const { data: created, error } = await admin.from('assets').insert({
    owner_id: null, isin, nombre: 'Índice de referencia (MSCI World)', tipo: 'etf', moneda: 'EUR',
    proveedor: 'eodhd', proveedor_id: serverEnv.benchmarkSymbol(),
  }).select('*').single();
  if (error) return null;
  return created as AssetRow;
}

/**
 * Productos propios que ahora se pueden reconocer (cripto guardada como fondo,
 * fondos con ISIN cuando hay clave de EODHD): se enlazan con el catálogo global.
 * Cada producto se reintenta como mucho una vez al mes.
 */
export async function fixOwnAssets(max = 40): Promise<{ enlazados: number; errores: string[] }> {
  const admin = createAdminClient();
  const today = hoyMadrid();
  const out = { enlazados: 0, errores: [] as string[] };
  const { data } = await admin.from('assets').select('*').not('owner_id', 'is', null)
    .or('proveedor.is.null,proveedor.eq.manual').neq('tipo', 'efectivo').limit(500);
  const pending = ((data ?? []) as AssetRow[]).filter((a) => {
    const tried = (a.metadata as { enlace_intentado?: string }).enlace_intentado;
    return !tried || daysBetween(tried, today) >= 30;
  }).slice(0, max);
  for (const a of pending) {
    try {
      const target = await marketTargetFor(a);
      if (!target) {
        await admin.from('assets').update({ metadata: { ...a.metadata, enlace_intentado: today } }).eq('id', a.id);
        continue;
      }
      const globalId = await ensureGlobalAsset(target);
      await relinkAsset(admin, a.id, globalId);
      out.enlazados++;
    } catch (e) {
      out.errores.push(`${a.nombre}: ${(e as Error).message}`);
    }
  }
  return out;
}

/**
 * Proceso nocturno: actualiza precios de todos los activos en uso,
 * el índice de referencia y los tipos de cambio.
 */
export async function runDailyIngest() {
  const admin = createAdminClient();
  const today = hoyMadrid();
  const summary = { activos: 0, precios: 0, tiposCambio: 0, enlazados: 0, errores: [] as string[] };

  try {
    const fix = await fixOwnAssets();
    summary.enlazados = fix.enlazados;
    summary.errores.push(...fix.errores);
  } catch (e) {
    summary.errores.push(`Enlazar productos: ${(e as Error).message}`);
  }

  const { data: holdings, error } = await admin.from('holdings').select('asset_id');
  if (error) throw new Error(error.message);
  const ids = [...new Set((holdings ?? []).map((h) => h.asset_id as string))];

  const assets: AssetRow[] = [];
  if (ids.length) {
    const { data } = await admin.from('assets').select('*').in('id', ids);
    assets.push(...((data ?? []) as AssetRow[]));
  }
  const bench = await ensureBenchmark();
  if (bench && !assets.some((a) => a.id === bench.id)) assets.push(bench);

  for (const a of assets) {
    try {
      // Histórico desde la primera operación de cualquier usuario con este activo.
      const { data: firstTx } = await admin.from('transactions').select('fecha, holdings!inner(asset_id)')
        .eq('holdings.asset_id', a.id).order('fecha').limit(1).maybeSingle();
      const from = firstTx?.fecha ? addDays(firstTx.fecha as string, -7) : undefined;
      const n = await syncAssetPrices(a, from);
      summary.activos++;
      summary.precios += n;
    } catch (e) {
      summary.errores.push(`${a.nombre}: ${(e as Error).message}`);
    }
  }

  const currencies = [...new Set(assets.map((a) => a.moneda.toUpperCase()).filter((c) => c !== 'EUR'))];
  if (currencies.length) {
    try {
      const { data: lastFx } = await admin.from('fx_rates').select('fecha').order('fecha', { ascending: false }).limit(1).maybeSingle();
      const from = lastFx ? addDays(lastFx.fecha as string, 1) : addDays(today, -DEFAULT_HISTORY_DAYS);
      if (from <= today) {
        const rates = await ecbRates(currencies, from);
        await upsertChunks(admin, 'fx_rates', rates.map((r) => ({ fecha: r.fecha, moneda: r.moneda, tipo_vs_eur: r.tipo })), 'fecha,moneda');
        summary.tiposCambio = rates.length;
      }
    } catch (e) {
      summary.errores.push(`Tipos de cambio: ${(e as Error).message}`);
    }
  }
  return summary;
}
