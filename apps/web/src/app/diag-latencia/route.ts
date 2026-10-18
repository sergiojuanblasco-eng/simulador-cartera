import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TEMPORAL: mide la distancia entre el servidor (Vercel) y la base de datos (Supabase).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const tiempos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const t = performance.now();
    await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: 'no-store' });
    tiempos.push(Math.round(performance.now() - t));
  }
  return NextResponse.json({ regionVercel: process.env.VERCEL_REGION ?? '?', msPorConsulta: tiempos });
}
