import { NextResponse } from 'next/server';
import { fetchAll } from '@/lib/data';
import { hoyMadrid } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Copia de seguridad: todas las operaciones (formato de la plantilla de importación) y los valores anotados a mano. */
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

  // Valores anotados a mano (cuentas, planes, depósitos): tipo «valor_anotado», importe = valor
  type VRow = { fecha: string; valor: string; aportado: string | null; holding: Row['holding'] };
  const vals = await fetchAll<VRow>((a, b) => supabase.from('valuations')
    .select('fecha, valor, aportado, holding:holdings (portfolio:portfolios (nombre), account:accounts (nombre), asset:assets (nombre, isin))')
    .order('fecha').order('id').range(a, b)).catch(() => [] as VRow[]);

  const header = ['fecha', 'cartera', 'broker', 'producto', 'isin', 'tipo', 'importe', 'participaciones', 'precio', 'comision', 'moneda', 'grupo', 'aportado'];
  const all = [
    ...rows.map((r) => [
      r.fecha, r.holding.portfolio.nombre, r.holding.account.nombre, r.holding.asset.nombre, r.holding.asset.isin ?? '',
      r.tipo, r.importe, r.cantidad, r.precio ?? '', r.comision, r.moneda, r.grupo_id ?? '', '',
    ]),
    ...vals.map((v) => [
      v.fecha, v.holding.portfolio.nombre, v.holding.account.nombre, v.holding.asset.nombre, '',
      'valor_anotado', v.valor, '', '', '0', 'EUR', '', v.aportado ?? '',
    ]),
  ].sort((a, b) => (String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0));
  const lines = [header.join(';'), ...all.map((r) => r.map(esc).join(';'))];
  return new NextResponse('﻿' + lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kartera-${hoyMadrid()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
