'use server';

import { isIsoDate } from '@kartera/core';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { isValorAnotado, type AssetRow } from '@/lib/db';
import { hoyMadrid } from '@/lib/format';
import { ensureAccount, ensureHolding } from '@/lib/movements';
import { SALDO_KINDS, type SaldoKind } from '@/lib/saldos';

type Result<T = undefined> = { ok: boolean; error?: string; data?: T };
const fail = (error: string) => ({ ok: false as const, error });
const MIGRATION_MSG = 'Falta un paso en la base de datos: ejecuta la actualización «valores anotados» (0007) en Supabase (SQL Editor) y vuelve a intentarlo.';
const isMissing = (msg: string) => /valuations|deposito|does not exist|schema cache|relation/i.test(msg);

function refresh(holdingIds: string[] = []) {
  for (const p of ['/', '/activos', '/saldos', '/mes', '/rendimiento', '/carteras', '/movimientos']) revalidatePath(p);
  for (const id of holdingIds) revalidatePath(`/activos/${id}`);
}

const money = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e12 ? Math.round(n * 100) / 100 : NaN;
};

function validFecha(fecha: string): boolean {
  return isIsoDate(fecha) && fecha >= '1990-01-01' && fecha <= hoyMadrid();
}

/** Crea una cuenta, plan de pensiones o depósito con su primer valor. */
export async function createManualProduct(input: {
  kind: SaldoKind;
  nombre: string;
  entidad: string;
  portfolioId: string;
  fecha: string;
  valor: number;
  aportado: number | null;
}): Promise<Result<{ holdingId: string }>> {
  const { supabase, user } = await requireUser();
  const kind = SALDO_KINDS.find((k) => k.kind === input.kind);
  if (!kind) return fail('Elige qué es: cuenta, plan, depósito u otro.');
  const nombre = input.nombre.trim().slice(0, 200);
  if (!nombre) return fail('Ponle un nombre, p. ej. «' + kind.ejemplo + '».');
  if (!validFecha(input.fecha)) return fail('La fecha no es válida.');
  const valor = money(input.valor);
  if (valor === null || Number.isNaN(valor)) return fail('Escribe cuánto vale hoy (o el saldo de la cuenta).');
  const aportado = kind.pideAportado ? money(input.aportado) : null;
  if (Number.isNaN(aportado)) return fail('Lo aportado no es válido.');

  const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', input.portfolioId).maybeSingle();
  if (!portfolio) return fail('Elige en qué cartera va.');

  const { data: asset, error: aErr } = await supabase.from('assets').insert({
    owner_id: user.id, nombre, tipo: kind.tipo, moneda: 'EUR', proveedor: 'anotado',
    metadata: { valor_anotado: true },
  }).select('id').single();
  if (aErr || !asset) return fail(aErr && isMissing(aErr.message) ? MIGRATION_MSG : 'No se pudo crear el producto.');

  try {
    const accountId = await ensureAccount(supabase, input.entidad.trim() || 'Banco');
    const holdingId = await ensureHolding(supabase, portfolio.id, accountId, asset.id);
    const { error: vErr } = await supabase.from('valuations').insert({ holding_id: holdingId, fecha: input.fecha, valor, aportado });
    if (vErr) {
      await supabase.from('holdings').delete().eq('id', holdingId);
      await supabase.from('assets').delete().eq('id', asset.id);
      return fail(isMissing(vErr.message) ? MIGRATION_MSG : 'No se pudo guardar el valor.');
    }
    refresh([holdingId]);
    return { ok: true, data: { holdingId } };
  } catch (e) {
    await supabase.from('assets').delete().eq('id', asset.id);
    return fail((e as Error).message || 'Algo ha fallado.');
  }
}

/** Anota de una vez el valor (y lo aportado) de varios productos en una fecha. */
export async function saveValuations(input: {
  fecha: string;
  items: { holdingId: string; valor: number | null; aportado: number | null }[];
}): Promise<Result<{ guardados: number }>> {
  const { supabase } = await requireUser();
  if (!validFecha(input.fecha)) return fail('La fecha no es válida.');
  const items = input.items.filter((i) => i.valor !== null && i.valor !== undefined).slice(0, 100);
  if (!items.length) return fail('Escribe al menos un valor.');

  const { data: hs } = await supabase.from('holdings').select('id, asset:assets (proveedor, tipo)').in('id', items.map((i) => i.holdingId));
  const ok = new Map(((hs ?? []) as unknown as { id: string; asset: Pick<AssetRow, 'proveedor' | 'tipo'> }[])
    .filter((h) => isValorAnotado(h.asset)).map((h) => [h.id, h.asset.tipo]));

  const rows: { holding_id: string; fecha: string; valor: number; aportado: number | null }[] = [];
  for (const i of items) {
    const tipo = ok.get(i.holdingId);
    if (!tipo) continue;
    const valor = money(i.valor);
    const aportado = tipo === 'efectivo' ? null : money(i.aportado);
    if (valor === null || Number.isNaN(valor)) return fail('Algún valor no es válido.');
    if (Number.isNaN(aportado)) return fail('Algún importe aportado no es válido.');
    rows.push({ holding_id: i.holdingId, fecha: input.fecha, valor, aportado });
  }
  if (!rows.length) return fail('No hay nada que guardar.');
  const { error } = await supabase.from('valuations').upsert(rows, { onConflict: 'holding_id,fecha' });
  if (error) return fail(isMissing(error.message) ? MIGRATION_MSG : 'No se pudieron guardar los valores.');
  refresh(rows.map((r) => r.holding_id));
  return { ok: true, data: { guardados: rows.length } };
}

export async function deleteValuation(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { data: v } = await supabase.from('valuations').select('holding_id').eq('id', id).maybeSingle();
  if (!v) return fail('Ese valor ya no existe.');
  const { error } = await supabase.from('valuations').delete().eq('id', id);
  if (error) return fail('No se pudo borrar.');
  refresh([v.holding_id]);
  return { ok: true };
}

/** Borra una cuenta, plan o depósito con todos sus valores. */
export async function deleteManualProduct(holdingId: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { data: h } = await supabase.from('holdings').select('id, asset_id, asset:assets (proveedor)').eq('id', holdingId).maybeSingle();
  const asset = (h?.asset ?? null) as unknown as Pick<AssetRow, 'proveedor'> | null;
  if (!h || !asset || !isValorAnotado(asset)) return fail('Solo se pueden borrar así las cuentas, planes y depósitos.');
  const { error } = await supabase.from('holdings').delete().eq('id', h.id);
  if (error) return fail('No se pudo borrar.');
  const { count } = await supabase.from('holdings').select('id', { count: 'exact', head: true }).eq('asset_id', h.asset_id);
  if (!count) await supabase.from('assets').delete().eq('id', h.asset_id);
  refresh();
  return { ok: true };
}
