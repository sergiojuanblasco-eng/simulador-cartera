'use server';

import { createHash } from 'node:crypto';
import { daysBetween, type TxType } from '@kartera/core';
import { revalidatePath } from 'next/cache';
import type { AssetChoice } from '@/lib/asset-choice';
import { requireUser } from '@/lib/auth';
import { hoyMadrid } from '@/lib/format';
import { productKey, rowIssues, type NormalizedRow } from '@/lib/import/parse';
import { detectCrypto, guessAssetType } from '@/lib/crypto';
import { cryptoTarget, relinkAsset } from '@/lib/market/asset-fix';
import { eodhdSearch } from '@/lib/market/providers';
import { ensureAccount, ensureHolding, priceOn, resolveAsset } from '@/lib/movements';

const MAX_ROWS = 5000;
const SOURCES = ['myinvestor', 'trade_republic', 'excel', 'ia'] as const;
type Source = (typeof SOURCES)[number];

export interface ProductPreview {
  key: string;
  nombre: string;
  isin: string | null;
  operaciones: number;
  match: AssetChoice;
  matchLabel: string;
}

export interface PreviewResult {
  ok: boolean;
  error?: string;
  products: ProductPreview[];
  nuevas: number;
  duplicadas: number;
  /** Ya registradas a mano: se corregirán con los datos exactos del bróker. */
  aCorregir?: number;
}

/** Huella estable de una fila: misma operación reimportada = misma huella. */
function hashRows(rows: NormalizedRow[]): string[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const base = [productKey(r), r.fecha, r.tipo, r.importe?.toFixed(2), r.cantidad?.toFixed(6) ?? ''].join('|');
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return createHash('sha256').update(`${base}|${n}`).digest('hex').slice(0, 40);
  });
}

function cleanRows(rows: NormalizedRow[]): NormalizedRow[] {
  return rows.slice(0, MAX_ROWS)
    .filter((r) => rowIssues(r).length === 0 && r.fecha! <= hoyMadrid() && r.fecha! >= '1990-01-01')
    .map((r) => ({
      ...r,
      clase: typeof r.clase === 'string' ? r.clase.slice(0, 40) : null,
      ticker: typeof r.ticker === 'string' && /^[A-Z0-9.]{1,12}$/.test(r.ticker) ? r.ticker : null,
    }));
}

/** Pistas del grupo de filas de un producto (la primera que las tenga). */
function hints(rs: NormalizedRow[]) {
  return { clase: rs.find((r) => r.clase)?.clase ?? null, ticker: rs.find((r) => r.ticker)?.ticker ?? null };
}

interface ManualTx { id: string; fecha: string; tipo: string; importe: number; assetId: string }

/** Operaciones registradas a mano (sin huella de importación) para reconocerlas al importar. */
async function loadManual(supabase: Awaited<ReturnType<typeof requireUser>>['supabase']): Promise<ManualTx[]> {
  const { data } = await supabase.from('transactions').select('id, fecha, tipo, importe, holding:holdings (asset_id)')
    .is('hash', null).in('tipo', ['compra', 'venta']).limit(5000);
  return (data ?? []).map((t) => ({
    id: t.id as string, fecha: t.fecha as string, tipo: t.tipo as string, importe: Number(t.importe),
    assetId: (t.holding as unknown as { asset_id: string } | null)?.asset_id ?? '',
  }));
}

/**
 * Filas del extracto que ya se registraron a mano (p. ej. desde «Invertir según mi plan»):
 * mismo producto y tipo, ±5 días y mismo importe (±2 %). Devuelve fila → operación manual.
 */
function matchManual(rows: NormalizedRow[], assetOf: (r: NormalizedRow) => string | null, manual: ManualTx[], skip: Set<number>): Map<number, string> {
  const used = new Set<string>();
  const out = new Map<number, string>();
  rows.forEach((r, i) => {
    if (skip.has(i) || (r.tipo !== 'compra' && r.tipo !== 'venta')) return;
    const assetId = assetOf(r);
    if (!assetId) return;
    const m = manual.find((t) => !used.has(t.id) && t.assetId === assetId && t.tipo === r.tipo
      && Math.abs(daysBetween(t.fecha, r.fecha!)) <= 5 && Math.abs(t.importe - r.importe!) <= Math.max(1, r.importe! * 0.02));
    if (m) { used.add(m.id); out.set(i, m.id); }
  });
  return out;
}

export async function previewImport(rawRows: NormalizedRow[]): Promise<PreviewResult> {
  const { supabase, user } = await requireUser();
  const rows = cleanRows(rawRows);
  if (rows.length === 0) return { ok: false, error: 'No hay operaciones válidas en el archivo.', products: [], nuevas: 0, duplicadas: 0 };

  // Duplicados: huellas que ya existen en tus operaciones
  const hashes = hashRows(rows);
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += 300) {
    const { data } = await supabase.from('transactions').select('hash').in('hash', hashes.slice(i, i + 300));
    for (const d of data ?? []) if (d.hash) existing.add(d.hash);
  }
  const duplicadas = hashes.filter((h) => existing.has(h)).length;

  // Productos: catálogo → EODHD por ISIN → producto propio
  const groups = new Map<string, NormalizedRow[]>();
  for (const r of rows) {
    const k = productKey(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const products: ProductPreview[] = [];
  for (const [key, rs] of groups) {
    const first = rs[0]!;
    const nombre = rs.find((r) => r.producto)?.producto ?? first.isin ?? 'Producto';
    let match: AssetChoice | null = null;
    let matchLabel = '';
    const { clase, ticker } = hints(rs);
    const crypto = detectCrypto({ isin: first.isin, ticker, nombre, clase });
    if (crypto) {
      const ext = await cryptoTarget(crypto, nombre);
      if (ext) {
        const { data: local } = await supabase.from('assets').select('id, nombre')
          .is('owner_id', null).eq('proveedor', 'coingecko').eq('proveedor_id', ext.proveedorId).maybeSingle();
        match = local ? { kind: 'local', id: local.id, nombre: local.nombre } : { kind: 'external', ...ext };
        matchLabel = `Cripto: precio diario de ${ext.ticker ?? ext.nombre} en euros`;
      } else {
        match = { kind: 'manual', nombre: nombre.slice(0, 200), tipo: 'cripto', ter: null, isin: null };
        matchLabel = 'Cripto (valor con el precio de tus operaciones)';
      }
    }
    if (!match && first.isin) {
      const { data: local } = await supabase.from('assets').select('id, nombre, owner_id')
        .eq('isin', first.isin).or(`owner_id.is.null,owner_id.eq.${user.id}`).limit(1).maybeSingle();
      if (local) {
        match = { kind: 'local', id: local.id, nombre: local.nombre };
        matchLabel = 'Encontrado en el catálogo';
      } else {
        try {
          const ext = (await eodhdSearch(first.isin))[0];
          if (ext) {
            match = { kind: 'external', ...ext };
            matchLabel = `Encontrado: ${ext.detalle}`;
          }
        } catch {
          // Sin proveedor disponible: se crea como producto propio.
        }
      }
    }
    if (!match) {
      // Cuentas remuneradas / efectivo: participaciones = importe (precio 1) o nombre que lo indica.
      const looksCash = rs.every((r) => r.cantidad && r.importe && Math.abs(r.cantidad - r.importe) < 0.01)
        || /cuenta|efectivo|cash|remunerad|dep[oó]sito/i.test(nombre);
      const tipo = looksCash ? 'efectivo' : guessAssetType({ clase, nombre }) ?? 'fondo';
      match = { kind: 'manual', nombre: nombre.slice(0, 200), tipo, ter: null, isin: first.isin };
      matchLabel = 'Se creará como producto propio (valor con el precio de tus operaciones)';
    }
    products.push({ key, nombre: match.nombre, isin: first.isin, operaciones: rs.length, match, matchLabel });
  }
  products.sort((a, b) => b.operaciones - a.operaciones);
  // Las ya registradas a mano también cuentan como «ya estaban»
  const localByKey = new Map(products.filter((x) => x.match.kind === 'local').map((x) => [x.key, (x.match as { id: string }).id]));
  const hashDup = new Set(hashes.map((h, i) => (existing.has(h) ? i : -1)).filter((i) => i >= 0));
  const manuales = matchManual(rows, (r) => localByKey.get(productKey(r)) ?? null, await loadManual(supabase), hashDup).size;
  return { ok: true, products, nuevas: rows.length - duplicadas - manuales, duplicadas, aCorregir: manuales };
}

export interface CommitInput {
  source: Source;
  rows: NormalizedRow[];
  /** Por producto: cartera existente (id) o nueva (nombre), y bróker. */
  assignments: Record<string, { portfolioId?: string; newPortfolio?: string; broker: string; match: AssetChoice }>;
}

export async function commitImport(input: CommitInput): Promise<{ ok: boolean; error?: string; importadas?: number; omitidas?: number; avisos?: string[] }> {
  const { supabase, user } = await requireUser();
  if (!SOURCES.includes(input.source)) return { ok: false, error: 'Origen no válido.' };
  const rows = cleanRows(input.rows);
  if (rows.length === 0) return { ok: false, error: 'No hay operaciones válidas.' };
  const avisos: string[] = [];

  try {
    const { data: imp, error: impErr } = await supabase.from('imports')
      .insert({ origen: input.source, estado: 'pendiente', resumen: {} }).select('id').single();
    if (impErr) throw new Error('No se pudo registrar la importación.');

    // Carteras nuevas (por nombre), una sola vez cada una
    const newPortfolios = new Map<string, string>();
    const { data: existing } = await supabase.from('portfolios').select('id, nombre');
    for (const p of existing ?? []) newPortfolios.set(p.nombre.toLowerCase(), p.id);

    const holdingByKey = new Map<string, string>();
    const assetByKey = new Map<string, string>();
    for (const [key, a] of Object.entries(input.assignments)) {
      let portfolioId = a.portfolioId ?? null;
      if (!portfolioId) {
        const name = (a.newPortfolio ?? '').trim().slice(0, 60) || 'Importada';
        portfolioId = newPortfolios.get(name.toLowerCase()) ?? null;
        if (!portfolioId) {
          const { data, error } = await supabase.from('portfolios').insert({ nombre: name, objetivo: 'personalizado' }).select('id').single();
          if (error) throw new Error(`No se pudo crear la cartera "${name}".`);
          portfolioId = data.id;
          newPortfolios.set(name.toLowerCase(), data.id);
        }
      }
      const assetId = await resolveAsset(supabase, user.id, a.match);
      // Una cripto que antes se guardó como producto propio (p. ej. «Bitcoin» como fondo): se junta con la buena.
      if (a.match.kind !== 'manual') {
        const { data: target } = await supabase.from('assets').select('tipo, proveedor_id').eq('id', assetId).single();
        if (target?.tipo === 'cripto' && target.proveedor_id) {
          const { data: olds } = await supabase.from('assets').select('id, nombre, isin, ticker')
            .eq('owner_id', user.id).neq('tipo', 'cripto');
          for (const o of olds ?? []) {
            const h = detectCrypto({ nombre: o.nombre, isin: o.isin, ticker: o.ticker });
            if (h?.coingeckoId === target.proveedor_id) await relinkAsset(supabase, o.id, assetId);
          }
        }
      }
      const accountId = await ensureAccount(supabase, a.broker || 'Otro');
      holdingByKey.set(key, await ensureHolding(supabase, portfolioId as string, accountId, assetId));
      assetByKey.set(key, assetId);
    }

    // Emparejar traspasos de salida/entrada (misma fecha ±7 días) con un grupo común
    const grupos = new Map<number, string>();
    const salidas = rows.map((r, i) => ({ r, i })).filter((x) => x.r.tipo === 'traspaso_salida');
    for (const { r, i } of rows.map((r, i) => ({ r, i })).filter((x) => x.r.tipo === 'traspaso_entrada')) {
      const pair = salidas.find((s) => !grupos.has(s.i) && Math.abs(daysBetween(s.r.fecha as string, r.fecha as string)) <= 7);
      const g = crypto.randomUUID();
      grupos.set(i, g);
      if (pair) grupos.set(pair.i, g);
    }

    const hashes = hashRows(rows);
    const already = new Set<string>();
    for (let i = 0; i < hashes.length; i += 300) {
      const { data: hashed } = await supabase.from('transactions').select('hash').in('hash', hashes.slice(i, i + 300));
      for (const x of hashed ?? []) if (x.hash) already.add(x.hash as string);
    }
    const manualMatch = matchManual(rows, (r) => assetByKey.get(productKey(r)) ?? null, await loadManual(supabase),
      new Set(hashes.map((h, i) => (already.has(h) ? i : -1)).filter((i) => i >= 0)));
    const toInsert: Record<string, unknown>[] = [];
    let omitidas = 0;
    let actualizadas = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const key = productKey(r);
      const holdingId = holdingByKey.get(key);
      if (!holdingId) { omitidas++; continue; }
      const manualId = manualMatch.get(i);
      if (manualId) {
        // Ya se registró a mano: se corrige con los datos exactos del bróker (fecha, participaciones, comisión).
        const cantidad = r.cantidad && r.cantidad > 0 ? r.cantidad : null;
        const { error: upErr } = await supabase.from('transactions').update({
          fecha: r.fecha, importe: Math.round(r.importe! * 100) / 100, comision: Math.round((r.comision ?? 0) * 100) / 100,
          ...(cantidad ? { cantidad: Number(cantidad.toFixed(10)), precio: Number((r.importe! / cantidad).toFixed(8)) } : {}),
          hash: hashes[i], import_id: imp.id,
        }).eq('id', manualId);
        if (!upErr) { actualizadas++; continue; }
      }
      let cantidad = r.cantidad && r.cantidad > 0 ? r.cantidad : null;
      if (!cantidad && r.precio && r.precio > 0) cantidad = r.importe! / r.precio;
      const tipo = r.tipo as TxType;
      if (!cantidad && tipo !== 'dividendo' && tipo !== 'comision') {
        const p = await priceOn(supabase, assetByKey.get(key)!, r.fecha!);
        if (p) cantidad = r.importe! / p;
      }
      if (!cantidad && tipo !== 'dividendo' && tipo !== 'comision') {
        omitidas++;
        avisos.push(`Fila ${r.fila}: sin participaciones ni precio para esa fecha.`);
        continue;
      }
      const isTransfer = tipo === 'traspaso_entrada' || tipo === 'traspaso_salida';
      toInsert.push({
        holding_id: holdingId,
        tipo,
        fecha: r.fecha,
        cantidad: cantidad ? Number(cantidad.toFixed(10)) : 0,
        precio: cantidad ? Number((r.importe! / cantidad).toFixed(8)) : null,
        importe: Math.round(r.importe! * 100) / 100,
        comision: Math.round((r.comision ?? 0) * 100) / 100,
        moneda: r.moneda ?? 'EUR',
        grupo_id: isTransfer ? grupos.get(i) ?? crypto.randomUUID() : null,
        import_id: imp.id,
        hash: hashes[i],
      });
    }

    let importadas = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const { data, error } = await supabase.from('transactions')
        .upsert(chunk, { onConflict: 'user_id,hash', ignoreDuplicates: true }).select('id');
      if (error) throw new Error('Error guardando operaciones: ' + error.message);
      importadas += data?.length ?? 0;
    }
    omitidas += toInsert.length - importadas;

    if (actualizadas) avisos.unshift(`${actualizadas} ${actualizadas === 1 ? 'compra ya estaba registrada a mano: se ha corregido' : 'compras ya estaban registradas a mano: se han corregido'} con los datos exactos del bróker.`);
    await supabase.from('imports').update({ estado: 'completado', resumen: { importadas, omitidas, actualizadas, avisos: avisos.slice(0, 50) } }).eq('id', imp.id);
    for (const p of ['/', '/activos', '/movimientos', '/rendimiento', '/mes', '/carteras']) revalidatePath(p);
    return { ok: true, importadas, omitidas, avisos };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
