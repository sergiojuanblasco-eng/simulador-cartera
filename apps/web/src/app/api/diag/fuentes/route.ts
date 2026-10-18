import { NextResponse } from 'next/server';
import { pickYahoo, yahooChart, yahooSearch } from '@/lib/market/providers';

export const dynamic = 'force-dynamic';

// TEMPORAL: comprobar desde producción que Yahoo encuentra estos ISIN (solo datos públicos de mercado).
const ISINS = ['IE00BYX5NX33', 'IE00B4ND3602', 'IE00BM67HT60', 'FR0013314234', 'IE00B18GC888', 'IE0031786696', 'IE00B42W4L06', 'IE00BK5BQT80'];

export async function GET() {
  const out: Record<string, unknown> = {};
  for (const isin of ISINS) {
    try {
      const rs = await yahooSearch(isin);
      const best = pickYahoo(rs);
      let chart: unknown = null;
      if (best) {
        const c = await yahooChart(best.proveedorId, '2026-09-01');
        chart = { moneda: c.currency, puntos: c.points.length, ultimo: c.points.at(-1), vivo: c.last };
      }
      out[isin] = { resultados: rs.map((r) => `${r.proveedorId} (${r.tipo}) ${r.nombre}`).slice(0, 5), elegido: best?.proveedorId ?? null, chart };
    } catch (e) {
      out[isin] = { error: (e as Error).message };
    }
  }
  return NextResponse.json(out);
}
