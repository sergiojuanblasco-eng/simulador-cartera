import { NextResponse } from 'next/server';
import { fetchAll } from '@/lib/data';
import { hoyMadrid } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Copia de seguridad: todas las operaciones en el mismo formato que la plantilla de importación. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  type Row = {
    fecha: string; tipo: string; importe: string; cantidad: string; precio: string | null; comision: string; moneda: string; grupo_id: string | null;
    holding: { portfolio: { nombre: string }; account: { nombre: string }; asset: { nombre: string; isin: string | null } };
  };
  const rows = await fetchAll<Row>((a, b) => supabase.from('transactions')
    .select('fecha, tipo, importe, cantidad, precio, comision, moneda, grupo_id, holding:holdings (portfolio:portfolios (nombre), account:accounts (nombre), asset:assets (nombre, isin))')
    .order('fecha').order('id').range(a, b));

  const header = ['fecha', 'cartera', 'broker', 'producto', 'isin', 'tipo', 'importe', 'participaciones', 'precio', 'comision', 'moneda', 'grupo'];
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push([
      r.fecha, r.holding.portfolio.nombre, r.holding.account.nombre, r.holding.asset.nombre, r.holding.asset.isin ?? '',
      r.tipo, r.importe, r.cantidad, r.precio ?? '', r.comision, r.moneda, r.grupo_id ?? '',
    ].map(esc).join(';'));
  }
  return new NextResponse('﻿' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kartera-${hoyMadrid()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
