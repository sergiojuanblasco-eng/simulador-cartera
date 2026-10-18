import 'server-only';
import type { PricePoint } from '@kartera/core';
import { fetchAll } from '@/lib/data';
import { serverEnv } from '@/lib/env';
import type { ServerSupabase } from '@/lib/supabase/server';

/** Precios del índice de referencia (catálogo global; los carga el proceso nocturno). */
export async function loadBenchmark(supabase: ServerSupabase, from: string): Promise<{ nombre: string; prices: PricePoint[] } | null> {
  const { data: asset } = await supabase.from('assets').select('id, nombre')
    .is('owner_id', null).eq('isin', serverEnv.benchmarkIsin()).maybeSingle();
  if (!asset) return null;
  const rows = await fetchAll<{ fecha: string; precio: string }>((a, b) =>
    supabase.from('asset_prices').select('fecha, precio').eq('asset_id', asset.id).gte('fecha', from).order('fecha').range(a, b));
  if (rows.length === 0) return null;
  return { nombre: 'MSCI World', prices: rows };
}

/** Rentabilidad por año natural de una serie de precios. */
export function yearlyFromPrices(prices: PricePoint[]): Map<number, number> {
  const endOfYear = new Map<number, number>();
  for (const p of prices) endOfYear.set(Number(p.fecha.slice(0, 4)), Number(p.precio));
  const out = new Map<number, number>();
  const first = prices[0] ? Number(prices[0].precio) : 0;
  for (const [y, v] of endOfYear) {
    const prev = endOfYear.get(y - 1) ?? first;
    if (prev > 0) out.set(y, v / prev - 1);
  }
  return out;
}
