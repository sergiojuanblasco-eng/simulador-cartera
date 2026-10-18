import { resolve4 } from 'node:dns/promises';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TEMPORAL: mide la distancia entre el servidor (Vercel) y la base de datos (Supabase).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const medir = async (path: string) => {
    const t: number[] = [];
    for (let i = 0; i < 12; i++) {
      const s = performance.now();
      const r = await fetch(`${url}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' });
      await r.arrayBuffer();
      t.push(Math.round(performance.now() - s));
    }
    const sorted = [...t].sort((a, b) => a - b);
    return { mediana: sorted[6], min: sorted[0], todos: t };
  };
  let ips: string[] = [];
  try { ips = await resolve4(new URL(url).hostname); } catch { /* sin DNS */ }
  const head = await fetch(`${url}/rest/v1/`, { headers: { apikey: key } });
  return NextResponse.json({
    regionVercel: process.env.VERCEL_REGION ?? '?',
    ips,
    cabeceras: Object.fromEntries([...head.headers.entries()].filter(([k]) => /ray|region|server|sb-|via|x-/.test(k))),
    auth: await medir('/auth/v1/health'),
    rest: await medir('/rest/v1/fx_rates?select=fecha&limit=1'),
  });
}
