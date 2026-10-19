'use server';

import { isIsoDate, type AssetType } from '@kartera/core';
import { revalidatePath } from 'next/cache';
import type { AssetChoice, SearchResult } from '@/lib/asset-choice';
import { isClase } from '@/lib/asset-class';
import { requireUser } from '@/lib/auth';
import { GOAL_PRESETS, isValorAnotado, type PortfolioGoal } from '@/lib/db';
import { hoyMadrid, numEs } from '@/lib/format';
import { ensureAccount, ensureHolding, positionOf, priceOn, resolveAsset } from '@/lib/movements';
import { marketTargetFor, relinkAsset } from '@/lib/market/asset-fix';
import { ensureGlobalAsset, syncAssetPrices } from '@/lib/market/ingest';
import { coingeckoSearch, eodhdSearch, yahooSearch } from '@/lib/market/providers';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

const fail = (error: string) => ({ ok: false as const, error });

function refresh() {
  for (const p of ['/', '/activos', '/movimientos', '/rendimiento', '/mes', '/carteras']) revalidatePath(p);
}

// ============================================================================ Carteras

const GOALS = new Set<PortfolioGoal>(['largo_plazo', 'medio_plazo', 'corto_plazo', 'colchon', 'especulativo', 'plan_pensiones', 'personalizado']);

export async function createPortfolio(input: {
  nombre: string;
  objetivo?: PortfolioGoal;
  objetivoImporte?: number | null;
  objetivoAnio?: number | null;
}): Promise<ActionResult<{ id: string; nombre: string }>> {
  const { supabase } = await requireUser();
  const nombre = input.nombre.trim().slice(0, 60);
  if (!nombre) return fail('Ponle un nombre a la cartera.');
  const objetivo = input.objetivo && GOALS.has(input.objetivo)
    ? input.objetivo
    : GOAL_PRESETS.find((g) => g.nombre.toLowerCase() === nombre.toLowerCase())?.objetivo ?? 'personalizado';
  const importe = input.objetivoImporte && input.objetivoImporte > 0 ? Math.round(input.objetivoImporte * 100) / 100 : null;
  const anio = input.objetivoAnio && input.objetivoAnio >= 2000 && input.objetivoAnio <= 2100 ? Math.trunc(input.objetivoAnio) : null;

  const { count } = await supabase.from('portfolios').select('id', { count: 'exact', head: true });
  const { data, error } = await supabase.from('portfolios')
    .insert({ nombre, objetivo, objetivo_importe: importe, objetivo_anio: anio, orden: count ?? 0 })
    .select('id, nombre').single();
  if (error) return fail(error.code === '23505' ? 'Ya tienes una cartera con ese nombre.' : 'No se pudo crear la cartera.');
  refresh();
  return { ok: true, data };
}

export async function updatePortfolio(id: string, input: { nombre: string; objetivoImporte: number | null; objetivoAnio: number | null }): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const nombre = input.nombre.trim().slice(0, 60);
  if (!nombre) return fail('El nombre no puede estar vacío.');
  const { error } = await supabase.from('portfolios').update({
    nombre,
    objetivo_importe: input.objetivoImporte && input.objetivoImporte > 0 ? input.objetivoImporte : null,
    objetivo_anio: input.objetivoAnio && input.objetivoAnio >= 2000 && input.objetivoAnio <= 2100 ? input.objetivoAnio : null,
  }).eq('id', id);
  if (error) return fail(error.code === '23505' ? 'Ya tienes una cartera con ese nombre.' : 'No se pudo guardar.');
  refresh();
  return { ok: true };
}

export async function deletePortfolio(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('portfolios').delete().eq('id', id);
  if (error) return fail('No se pudo borrar la cartera.');
  refresh();
  return { ok: true };
}

// ============================================================================ Buscador de productos

export async function searchAssets(q: string): Promise<SearchResult[]> {
  const { supabase } = await requireUser();
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const safe = term.replace(/[%_,()]/g, ' ');

  const { data: found } = await supabase.from('assets')
    .select('id, nombre, isin, ticker, tipo, moneda, proveedor')
    .or(`nombre.ilike.%${safe}%,isin.ilike.${safe.toUpperCase()}%,ticker.ilike.${safe}%`)
    .limit(12);
  // Las cuentas, planes y depósitos anotados a mano se actualizan en «Saldos», no con movimientos
  const local = (found ?? []).filter((a) => !isValorAnotado(a)).slice(0, 8);
  const results: SearchResult[] = local.map((a) => ({
    choice: { kind: 'local', id: a.id, nombre: a.nombre },
    nombre: a.nombre,
    detalle: [a.isin, a.ticker, a.moneda].filter(Boolean).join(' · '),
  }));
  const knownIsins = new Set(local.map((a) => a.isin).filter(Boolean));

  if (term.length >= 3) {
    const [eod, yh, cg] = await Promise.allSettled([eodhdSearch(term), yahooSearch(term), coingeckoSearch(term)]);
    const eodRows = eod.status === 'fulfilled' ? eod.value : [];
    // Yahoo (gratis) solo si EODHD no ha dado nada
    const yhRows = eodRows.length === 0 && yh.status === 'fulfilled' ? yh.value.slice(0, 8) : [];
    const ext = [...eodRows, ...yhRows, ...(cg.status === 'fulfilled' ? cg.value : [])];
    for (const e of ext) {
      if (e.isin && knownIsins.has(e.isin)) continue;
      results.push({ choice: { kind: 'external', ...e }, nombre: e.nombre, detalle: [e.isin, e.detalle].filter(Boolean).join(' · ') });
    }
  }
  return results.slice(0, 20);
}

const SALDOS_MSG = 'Las cuentas, planes y depósitos se actualizan anotando su valor en «Saldos y valores».';

/** ¿Alguna de estas posiciones es una cuenta, plan o depósito con valor anotado? */
async function anyAnotado(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], ids: string[]): Promise<boolean> {
  const { data } = await supabase.from('holdings').select('id, asset:assets (proveedor)').in('id', ids);
  return ((data ?? []) as unknown as { asset: { proveedor: string | null } | null }[]).some((h) => !!h.asset && isValorAnotado(h.asset));
}

function validDate(fecha: string): boolean {
  return isIsoDate(fecha) && fecha >= '1990-01-01' && fecha <= hoyMadrid();
}

// ============================================================================ Movimientos

export interface MovementInput {
  tipo: 'aportacion' | 'retirada';
  portfolioId: string;
  holdingId?: string | null;
  asset?: AssetChoice | null;
  broker?: string | null;
  fecha: string;
  importe: number;
  cantidad?: number | null;
  comision?: number | null;
}

export async function addMovement(input: MovementInput): Promise<ActionResult<{ holdingId: string }>> {
  const { supabase, user } = await requireUser();
  if (!validDate(input.fecha)) return fail('La fecha no es válida.');
  if (!(input.importe > 0) || input.importe > 1e10) return fail('Indica un importe mayor que cero.');
  const comision = Math.max(0, input.comision ?? 0);

  try {
    let holdingId = input.holdingId ?? null;
    let assetId: string;
    if (holdingId) {
      const { data: h } = await supabase.from('holdings').select('id, asset_id').eq('id', holdingId).single();
      if (!h) return fail('Ese producto ya no existe.');
      if (await anyAnotado(supabase, [h.id])) return fail(SALDOS_MSG);
      assetId = h.asset_id;
    } else {
      if (!input.asset) return fail('Elige un producto.');
      if (input.tipo === 'retirada') return fail('Solo puedes retirar de un producto que ya tengas.');
      assetId = await resolveAsset(supabase, user.id, input.asset);
      const accountId = await ensureAccount(supabase, input.broker ?? 'Otro');
      holdingId = await ensureHolding(supabase, input.portfolioId, accountId, assetId);
    }

    let cantidad = input.cantidad && input.cantidad > 0 ? input.cantidad : null;
    let precio: number | null = null;
    if (!cantidad) {
      precio = await priceOn(supabase, assetId, input.fecha);
      if (!precio) return fail('No tenemos el precio de ese día: indica las participaciones.');
      cantidad = input.importe / precio;
    } else {
      precio = input.importe / cantidad;
    }

    if (input.tipo === 'retirada') {
      const pos = await positionOf(supabase, holdingId);
      if (cantidad > pos * 1.01 + 1e-9) return fail(`Solo tienes ${numEs(pos, 4)} participaciones.`);
      cantidad = Math.min(cantidad, pos);
    }

    const { error } = await supabase.from('transactions').insert({
      holding_id: holdingId,
      tipo: input.tipo === 'aportacion' ? 'compra' : 'venta',
      fecha: input.fecha,
      cantidad: Number(cantidad.toFixed(10)),
      precio: Number(precio.toFixed(8)),
      importe: Math.round(input.importe * 100) / 100,
      comision: Math.round(comision * 100) / 100,
    });
    if (error) return fail('No se pudo guardar el movimiento.');
    refresh();
    return { ok: true, data: { holdingId } };
  } catch (e) {
    return fail((e as Error).message || 'Algo ha fallado.');
  }
}

export interface RebalanceInput {
  fromHoldingId: string;
  toHoldingId?: string | null;
  toAsset?: AssetChoice | null;
  broker?: string | null;
  importe: number;
  fecha: string;
  modo: 'traspaso' | 'venta';
}

export async function rebalance(input: RebalanceInput): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!validDate(input.fecha)) return fail('La fecha no es válida.');
  if (!(input.importe > 0)) return fail('Indica un importe mayor que cero.');

  try {
    const { data: from } = await supabase.from('holdings').select('id, asset_id, portfolio_id, account_id').eq('id', input.fromHoldingId).single();
    if (!from) return fail('El producto de origen no existe.');

    let toHoldingId = input.toHoldingId ?? null;
    let toAssetId: string;
    if (toHoldingId) {
      const { data: to } = await supabase.from('holdings').select('id, asset_id').eq('id', toHoldingId).single();
      if (!to) return fail('El producto de destino no existe.');
      toAssetId = to.asset_id;
    } else {
      if (!input.toAsset) return fail('Elige el producto de destino.');
      toAssetId = await resolveAsset(supabase, user.id, input.toAsset);
      const accountId = input.broker ? await ensureAccount(supabase, input.broker) : from.account_id;
      toHoldingId = await ensureHolding(supabase, from.portfolio_id, accountId, toAssetId);
    }
    if (toHoldingId === from.id) return fail('El origen y el destino son el mismo producto.');
    if (await anyAnotado(supabase, [from.id, toHoldingId])) return fail(SALDOS_MSG);

    const pFrom = await priceOn(supabase, from.asset_id, input.fecha);
    const pTo = await priceOn(supabase, toAssetId, input.fecha);
    if (!pFrom || !pTo) return fail('No tenemos el precio de ese día de alguno de los dos productos.');

    const pos = await positionOf(supabase, from.id);
    let qFrom = input.importe / pFrom;
    if (qFrom > pos * 1.01 + 1e-9) return fail('No hay suficiente dinero en el producto de origen.');
    qFrom = Math.min(qFrom, pos);
    const qTo = input.importe / pTo;
    const grupo = crypto.randomUUID();
    const imp = Math.round(input.importe * 100) / 100;

    const rows = input.modo === 'traspaso'
      ? [
          { holding_id: from.id, tipo: 'traspaso_salida', fecha: input.fecha, cantidad: qFrom, precio: pFrom, importe: imp, grupo_id: grupo },
          { holding_id: toHoldingId, tipo: 'traspaso_entrada', fecha: input.fecha, cantidad: qTo, precio: pTo, importe: imp, grupo_id: grupo },
        ]
      : [
          { holding_id: from.id, tipo: 'venta', fecha: input.fecha, cantidad: qFrom, precio: pFrom, importe: imp, grupo_id: grupo },
          { holding_id: toHoldingId, tipo: 'compra', fecha: input.fecha, cantidad: qTo, precio: pTo, importe: imp, grupo_id: grupo },
        ];
    const { error } = await supabase.from('transactions').insert(
      rows.map((r) => ({ ...r, cantidad: Number(r.cantidad.toFixed(10)), precio: Number(r.precio.toFixed(8)) })),
    );
    if (error) return fail('No se pudo guardar el rebalanceo.');
    refresh();
    return { ok: true };
  } catch (e) {
    return fail((e as Error).message || 'Algo ha fallado.');
  }
}

/** Comisión que te cobra el banco o el bróker en efectivo (custodia, mantenimiento…). */
export async function addFee(input: { holdingId: string; fecha: string; importe: number; notas?: string | null }): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!validDate(input.fecha)) return fail('La fecha no es válida.');
  if (!(input.importe > 0) || input.importe > 1e7) return fail('Indica un importe mayor que cero.');
  const { data: h } = await supabase.from('holdings').select('id').eq('id', input.holdingId).maybeSingle();
  if (!h) return fail('Ese producto ya no existe.');
  if (await anyAnotado(supabase, [h.id])) return fail(SALDOS_MSG);
  const { error } = await supabase.from('transactions').insert({
    holding_id: h.id, tipo: 'comision', fecha: input.fecha, cantidad: 0, precio: null,
    importe: Math.round(input.importe * 100) / 100, comision: 0,
    notas: (input.notas ?? '').trim().slice(0, 200) || 'Comisión cobrada en efectivo',
  });
  if (error) return fail('No se pudo guardar la comisión.');
  refresh();
  revalidatePath(`/activos/${h.id}`);
  return { ok: true };
}

/** Borra un movimiento (y su pareja si es un traspaso o rebalanceo). */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data: tx } = await supabase.from('transactions').select('id, grupo_id, holding_id').eq('id', id).maybeSingle();
  if (!tx) return fail('Ese movimiento ya no existe.');
  // Posiciones afectadas: la del movimiento (y la de su pareja si es un traspaso o rebalanceo)
  const afectadas = new Set<string>([tx.holding_id]);
  if (tx.grupo_id) {
    const { data: pareja } = await supabase.from('transactions').select('holding_id').eq('grupo_id', tx.grupo_id);
    for (const t of pareja ?? []) afectadas.add(t.holding_id);
  }
  const q = supabase.from('transactions').delete();
  const { error } = tx.grupo_id ? await q.eq('grupo_id', tx.grupo_id) : await q.eq('id', id);
  if (error) return fail('No se pudo borrar.');
  // Limpia SOLO esas posiciones si se han quedado sin ninguna operación. Nunca las cuentas,
  // planes y depósitos anotados a mano: no tienen operaciones, su valor está en «Saldos».
  for (const hid of afectadas) {
    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('holding_id', hid);
    if (count !== 0) continue;
    if (await anyAnotado(supabase, [hid])) continue;
    const { count: vals } = await supabase.from('valuations').select('id', { count: 'exact', head: true }).eq('holding_id', hid);
    if (vals) continue;
    await supabase.from('holdings').delete().eq('id', hid);
  }
  refresh();
  return { ok: true };
}

// ============================================================================ Productos

const ASSET_TYPES = new Set(['fondo', 'etf', 'accion', 'cripto', 'monetario', 'plan_pensiones', 'efectivo', 'deposito', 'otro']);
const MANUAL_TYPES = new Set(['efectivo', 'plan_pensiones', 'deposito', 'otro']);
const MIGRATION_MSG = 'Falta un paso en la base de datos: ejecuta la actualización en Supabase (SQL Editor) y vuelve a intentarlo.';

/**
 * Edita un producto: la clase de activo siempre (se guarda en tu posición);
 * nombre, vehículo, TER e ISIN solo si es un producto propio. Si con los datos nuevos se reconoce
 * (cripto → CoinGecko, ISIN → EODHD) se enlaza con datos de mercado.
 */
export async function updateProduct(input: {
  holdingId: string;
  clase: string;
  nombre?: string;
  tipo?: string;
  terPct?: number | null;
  isin?: string;
  /** TER propio (en %) para un producto con datos de mercado; null = usar el del proveedor/catálogo. */
  miTerPct?: number | null;
  /** Comisión fija al año en EUR (custodia, mantenimiento…); null = ninguna. */
  comisionFija?: number | null;
}): Promise<ActionResult<{ holdingId: string; enlazado: string | null }>> {
  const { supabase, user } = await requireUser();
  const { data: h } = await supabase.from('holdings').select('*, asset:assets (id, owner_id, nombre, isin, ticker, tipo, proveedor)')
    .eq('id', input.holdingId).maybeSingle();
  const asset = (h?.asset ?? null) as unknown as { id: string; owner_id: string | null; ticker: string | null; proveedor: string | null } | null;
  if (!h || !asset) return fail('Producto no encontrado.');
  if (input.clase !== 'auto' && !isClase(input.clase)) return fail('Clase de activo no válida.');

  // 1) Clase de activo: es una decisión tuya, vale para cualquier producto.
  const nueva = input.clase === 'auto' ? null : input.clase;
  if (nueva !== ((h as { clase?: string | null }).clase ?? null)) {
    const { error: claseErr } = await supabase.from('holdings').update({ clase: nueva }).eq('id', h.id);
    if (claseErr) return fail(/clase|column/i.test(claseErr.message) ? MIGRATION_MSG : 'No se pudo guardar la clase de activo.');
  }

  // 2) TER propio (productos con datos de mercado)
  if (input.miTerPct !== undefined) {
    const t = input.miTerPct === null ? null : input.miTerPct / 100;
    if (t !== null && (!Number.isFinite(t) || t < 0 || t >= 0.2)) return fail('El TER debe estar entre 0 % y 20 %.');
    const actual = (h as { ter?: string | null }).ter ?? null;
    if (t !== (actual === null ? null : Number(actual))) {
      const { error: terErr } = await supabase.from('holdings').update({ ter: t === null ? null : Math.round(t * 1e6) / 1e6 }).eq('id', h.id);
      if (terErr) return fail(/ter|column/i.test(terErr.message) ? MIGRATION_MSG : 'No se pudo guardar el TER.');
    }
  }

  // 3) Comisión fija al año (custodia, mantenimiento…): vale para cualquier producto
  if (input.comisionFija !== undefined) {
    const f = input.comisionFija === null ? null : Math.round(input.comisionFija * 100) / 100;
    if (f !== null && (!Number.isFinite(f) || f < 0 || f >= 100000)) return fail('La comisión fija no es válida.');
    const actual = (h as { comision_fija?: string | null }).comision_fija ?? null;
    if (f !== (actual === null ? null : Number(actual))) {
      const { error: fErr } = await supabase.from('holdings').update({ comision_fija: f }).eq('id', h.id);
      if (fErr) return fail(/comision_fija|column/i.test(fErr.message) ? 'Falta un paso en la base de datos: ejecuta la actualización «comisión fija» (0008) en Supabase y vuelve a intentarlo.' : 'No se pudo guardar la comisión fija.');
    }
  }

  const editaDatos = input.nombre !== undefined;
  if (!editaDatos) {
    refresh();
    revalidatePath(`/activos/${h.id}`);
    return { ok: true, data: { holdingId: h.id, enlazado: null } };
  }
  if (asset.owner_id !== user.id) return fail('Este producto tiene datos de mercado y se actualiza solo.');

  const nombre = (input.nombre ?? '').trim().slice(0, 200);
  if (!nombre) return fail('Escribe el nombre del producto.');
  if (!ASSET_TYPES.has(input.tipo ?? '')) return fail('Vehículo no válido.');
  const anotado = isValorAnotado(asset);
  if (anotado && !MANUAL_TYPES.has(input.tipo ?? '')) return fail('Vehículo no válido.');
  const ter = input.terPct == null ? null : input.terPct / 100;
  if (ter !== null && (!Number.isFinite(ter) || ter < 0 || ter >= 0.2)) return fail('El TER debe estar entre 0 % y 20 %.');
  const isin = anotado ? '' : (input.isin ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (isin && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return fail('El ISIN tiene 12 caracteres: 2 letras de país, 9 letras o números y 1 número (p. ej. IE00B4L5Y983).');

  const tipo = input.tipo as AssetType;
  const { error } = await supabase.from('assets')
    .update({ nombre, tipo, ter: ter === null ? null : Math.round(ter * 1e6) / 1e6, isin: isin || null })
    .eq('id', asset.id);
  if (error) return fail('No se pudo guardar el producto.');

  // ¿Ahora lo reconocemos? Enlazar con datos de mercado (no en cuentas, planes y depósitos anotados).
  let enlazado: string | null = null;
  let holdingId = h.id;
  if (!anotado) try {
    const target = await marketTargetFor({ nombre, isin: isin || null, ticker: asset.ticker, tipo });
    if (target) {
      const globalId = await ensureGlobalAsset(target);
      try {
        await syncAssetPrices({ id: globalId, proveedor: target.proveedor, proveedor_id: target.proveedorId });
      } catch {
        // Los precios llegarán en el proceso nocturno.
      }
      const moved = await relinkAsset(supabase, asset.id, globalId);
      holdingId = moved.get(h.id) ?? h.id;
      enlazado = target.nombre;
    }
  } catch {
    // Si falla el enlace, el producto queda guardado como propio con los datos nuevos.
  }
  refresh();
  revalidatePath(`/activos/${holdingId}`);
  return { ok: true, data: { holdingId, enlazado } };
}
