import { NextResponse } from 'next/server';
import { refreshPrices } from '@/lib/market/live';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Al abrir la app: actualiza los precios de tus productos (con límite de frecuencia por producto). */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { data: holdings } = await supabase.from('holdings').select('asset_id');
  try {
    const r = await refreshPrices((holdings ?? []).map((h) => h.asset_id as string));
    return NextResponse.json({ actualizados: r.actualizados });
  } catch {
    return NextResponse.json({ actualizados: 0 });
  }
}
