import 'server-only';
import type { AssetChoice } from '@/lib/asset-choice';
import { ensureGlobalAsset, syncAssetPrices } from '@/lib/market/ingest';
import type { ServerSupabase } from '@/lib/supabase/server';

/** Convierte la elección del buscador en un id de activo (creándolo si hace falta). */
export async function resolveAsset(supabase: ServerSupabase, userId: string, choice: AssetChoice): Promise<string> {
  if (choice.kind === 'local') return choice.id;
  if (choice.kind === 'external') {
    const id = await ensureGlobalAsset({ ...choice, detalle: choice.detalle ?? '' });
    try {
      await syncAssetPrices({ id, proveedor: choice.proveedor, proveedor_id: choice.proveedorId });
    } catch {
      // Sin precios todavía: se usa el precio de las operaciones hasta el proceso nocturno.
    }
    return id;
  }
  const nombre = choice.nombre.trim().slice(0, 200);
  if (!nombre) throw new Error('Escribe el nombre del producto.');
  const isin = choice.isin && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(choice.isin) ? choice.isin : null;
  if (isin) {
    const { data: own } = await supabase.from('assets').select('id').eq('owner_id', userId).eq('isin', isin).limit(1).maybeSingle();
    if (own) return own.id;
  } else {
    // Mismo nombre ya creado antes (p. ej. al reimportar): se reutiliza.
    const { data: own } = await supabase.from('assets').select('id').eq('owner_id', userId).is('isin', null).eq('nombre', nombre).limit(1).maybeSingle();
    if (own) return own.id;
  }
  const { data, error } = await supabase.from('assets').insert({
    owner_id: userId,
    nombre,
    tipo: choice.tipo,
    moneda: 'EUR',
    ter: choice.ter !== null && choice.ter >= 0 && choice.ter < 0.2 ? choice.ter : null,
    isin,
    proveedor: 'manual',
  }).select('id').single();
  if (error) throw new Error('No se pudo crear el producto.');
  return data.id;
}

export async function ensureAccount(supabase: ServerSupabase, nombre: string): Promise<string> {
  const n = nombre.trim().slice(0, 60) || 'Otro';
  const { data } = await supabase.from('accounts').select('id').eq('nombre', n).maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await supabase.from('accounts').insert({ nombre: n, entidad: n }).select('id').single();
  if (error) throw new Error('No se pudo crear la cuenta.');
  return created.id;
}

export async function ensureHolding(supabase: ServerSupabase, portfolioId: string, accountId: string, assetId: string): Promise<string> {
  const { data } = await supabase.from('holdings').select('id')
    .eq('portfolio_id', portfolioId).eq('account_id', accountId).eq('asset_id', assetId).maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await supabase.from('holdings')
    .insert({ portfolio_id: portfolioId, account_id: accountId, asset_id: assetId }).select('id').single();
  if (error) throw new Error('No se pudo añadir el producto a la cartera.');
  return created.id;
}

/** Precio del activo en (o justo antes de) una fecha, en su moneda. */
export async function priceOn(supabase: ServerSupabase, assetId: string, fecha: string): Promise<number | null> {
  const { data: asset } = await supabase.from('assets').select('tipo').eq('id', assetId).single();
  if (asset?.tipo === 'efectivo') return 1;
  const { data } = await supabase.from('asset_prices').select('precio, fecha')
    .eq('asset_id', assetId).lte('fecha', fecha).order('fecha', { ascending: false }).limit(1).maybeSingle();
  return data ? Number(data.precio) : null;
}

export async function positionOf(supabase: ServerSupabase, holdingId: string): Promise<number> {
  const { data } = await supabase.from('v_positions').select('cantidad').eq('holding_id', holdingId).maybeSingle();
  return data ? Number(data.cantidad) : 0;
}
