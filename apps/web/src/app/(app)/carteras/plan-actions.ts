'use server';

import { isIsoDate } from '@kartera/core';
import { revalidatePath } from 'next/cache';
import type { AssetChoice } from '@/lib/asset-choice';
import { requireUser } from '@/lib/auth';
import { hoyMadrid } from '@/lib/format';
import { ensureAccount, ensureHolding, priceOn, resolveAsset } from '@/lib/movements';
import { PROXY_OPTIONS, type PlanItem } from '@/lib/plan';
import { isValorAnotado } from '@/lib/db';

type Result<T = undefined> = { ok: boolean; error?: string; data?: T };
const fail = (error: string) => ({ ok: false as const, error });
const PROXIES = new Set(PROXY_OPTIONS.map((p) => p.id));
const MIGRATION_MSG = 'Falta un paso en la base de datos: ejecuta la actualización «cartera objetivo» en Supabase (SQL Editor) y vuelve a intentarlo.';

function refresh(portfolioId: string) {
  for (const p of ['/', '/carteras', `/carteras/${portfolioId}`, '/movimiento', '/activos', '/movimientos', '/mes', '/rendimiento', '/saldos']) revalidatePath(p);
}

export interface PlanRowInput {
  assetId?: string | null;
  asset?: AssetChoice | null;
  pct: number;
  proxy: string | null;
}

/** Guarda la cartera objetivo (reparto en % que suma 100) y la aportación mensual prevista. */
export async function savePlan(portfolioId: string, input: { aportacionMensual: number | null; rows: PlanRowInput[] }): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', portfolioId).maybeSingle();
  if (!portfolio) return fail('Cartera no encontrada.');

  const rows = input.rows.filter((r) => Number.isFinite(r.pct) && r.pct > 0);
  if (rows.length === 0) return fail('Pon un % a al menos un producto.');
  if (rows.length > 50) return fail('Como mucho 50 productos.');
  const total = rows.reduce((a, r) => a + r.pct, 0);
  if (Math.abs(total - 100) > 0.05) return fail(`Los porcentajes deben sumar 100 % (ahora suman ${total.toLocaleString('es-ES', { maximumFractionDigits: 2 })} %).`);
  const mensual = input.aportacionMensual;
  if (mensual !== null && (!Number.isFinite(mensual) || mensual < 0 || mensual >= 1e7)) return fail('La aportación mensual no es válida.');

  try {
    const items: PlanItem[] = [];
    for (const r of rows) {
      let assetId = r.assetId ?? null;
      if (!assetId) {
        if (!r.asset) return fail('Falta elegir un producto.');
        assetId = await resolveAsset(supabase, user.id, r.asset);
      }
      if (items.some((x) => x.assetId === assetId)) return fail('Hay un producto repetido.');
      items.push({ assetId, pct: Math.round(r.pct * 100) / 100, proxy: r.proxy && PROXIES.has(r.proxy) ? r.proxy : null });
    }
    // Todos los productos deben ser visibles para el usuario (catálogo o suyos).
    const { data: visible } = await supabase.from('assets').select('id').in('id', items.map((x) => x.assetId));
    if ((visible ?? []).length !== items.length) return fail('Algún producto ya no existe.');

    const { error } = await supabase.from('portfolios')
      .update({ reparto_objetivo: items, aportacion_mensual: mensual === null ? null : Math.round(mensual * 100) / 100 })
      .eq('id', portfolioId);
    if (error) return fail(/reparto_objetivo|aportacion_mensual|column/i.test(error.message) ? MIGRATION_MSG : 'No se pudo guardar.');
    refresh(portfolioId);
    return { ok: true };
  } catch (e) {
    return fail((e as Error).message || 'Algo ha fallado.');
  }
}

/** Registra de una vez las compras del reparto (aportación según el plan). */
export async function investPlan(portfolioId: string, input: {
  fecha: string;
  comisionPorOrden: number;
  broker: string;
  lines: { assetId: string; importe: number; cantidad?: number | null; comision?: number | null }[];
}): Promise<Result<{ registradas: number; sinPrecio: string[] }>> {
  const { supabase } = await requireUser();
  if (!isIsoDate(input.fecha) || input.fecha > hoyMadrid() || input.fecha < '1990-01-01') return fail('La fecha no es válida.');
  const comision = Math.max(0, Math.min(1000, Number(input.comisionPorOrden) || 0));
  const lines = input.lines.filter((l) => Number.isFinite(l.importe) && l.importe > 0 && l.importe < 1e9).slice(0, 50);
  if (!lines.length) return fail('No hay nada que registrar.');

  const { data: holdings } = await supabase.from('holdings').select('id, asset_id, account_id').eq('portfolio_id', portfolioId);
  if (!holdings) return fail('Cartera no encontrada.');
  const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', portfolioId).maybeSingle();
  if (!portfolio) return fail('Cartera no encontrada.');

  const toInsert: Record<string, unknown>[] = [];
  const valuations: { holding_id: string; fecha: string; valor: number; aportado: number | null }[] = [];
  const sinPrecio: string[] = [];
  try {
    for (const l of lines) {
      const { data: asset } = await supabase.from('assets').select('id, nombre, proveedor').eq('id', l.assetId).maybeSingle();
      if (!asset) continue;
      if (isValorAnotado(asset)) {
        // Cuenta, plan o depósito: se suma al último valor anotado
        const holdingId = holdings.find((h) => h.asset_id === asset.id)?.id;
        if (!holdingId) continue;
        const { data: prev } = await supabase.from('valuations').select('valor, aportado')
          .eq('holding_id', holdingId).lte('fecha', input.fecha).order('fecha', { ascending: false }).limit(1).maybeSingle();
        const { data: conAp } = await supabase.from('valuations').select('aportado')
          .eq('holding_id', holdingId).lte('fecha', input.fecha).not('aportado', 'is', null).order('fecha', { ascending: false }).limit(1).maybeSingle();
        const importe = Math.round(l.importe * 100) / 100;
        valuations.push({
          holding_id: holdingId, fecha: input.fecha,
          valor: Math.round((Number(prev?.valor ?? 0) + importe) * 100) / 100,
          aportado: conAp ? Math.round((Number(conAp.aportado) + importe) * 100) / 100 : null,
        });
        continue;
      }
      const cantidadDada = l.cantidad && Number.isFinite(l.cantidad) && l.cantidad > 0 ? l.cantidad : null;
      const precio = cantidadDada ? l.importe / cantidadDada : await priceOn(supabase, asset.id, input.fecha);
      if (!precio) { sinPrecio.push(asset.nombre); continue; }
      let holdingId = holdings.find((h) => h.asset_id === asset.id)?.id;
      if (!holdingId) {
        const accountId = await ensureAccount(supabase, input.broker || 'Otro');
        holdingId = await ensureHolding(supabase, portfolioId, accountId, asset.id);
      }
      const importe = Math.round(l.importe * 100) / 100;
      const comLinea = l.comision != null && Number.isFinite(l.comision) ? Math.max(0, Math.min(1000, l.comision)) : comision;
      toInsert.push({
        holding_id: holdingId, tipo: 'compra', fecha: input.fecha,
        cantidad: Number((importe / precio).toFixed(10)), precio: Number(precio.toFixed(8)),
        importe, comision: Math.round(comLinea * 100) / 100,
        notas: 'Aportación según la cartera objetivo',
      });
    }
    if (toInsert.length) {
      const { error } = await supabase.from('transactions').insert(toInsert);
      if (error) return fail('No se pudieron guardar las compras.');
    }
    if (valuations.length) {
      const { error } = await supabase.from('valuations').upsert(valuations, { onConflict: 'holding_id,fecha' });
      if (error) return fail('No se pudieron anotar las aportaciones a tus cuentas o planes.');
    }
    refresh(portfolioId);
    return { ok: true, data: { registradas: toInsert.length + valuations.length, sinPrecio } };
  } catch (e) {
    return fail((e as Error).message || 'Algo ha fallado.');
  }
}
