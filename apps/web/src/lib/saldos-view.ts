import 'server-only';
import { TIPO_LABEL, vehiculoOf } from '@kartera/core';
import { isValorAnotado, type ValuationRow } from '@/lib/db';
import type { UserData } from '@/lib/data';
import { pideAportado } from '@/lib/saldos';

/** Último valor anotado y último aportado conocido de un producto. */
export function lastValuation(rows: ValuationRow[] | undefined): { valor: number; aportado: number | null; fecha: string } | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const last = sorted[sorted.length - 1]!;
  let aportado: number | null = null;
  for (const r of sorted) if (r.aportado !== null && r.aportado !== undefined) aportado = Number(r.aportado);
  return { valor: Number(last.valor), aportado, fecha: last.fecha };
}

/** Cuentas, planes y depósitos de la persona, con su último valor. */
export function saldoRows(data: UserData) {
  const carteras = new Map(data.portfolios.map((p) => [p.id, p.nombre]));
  const cuentas = new Map(data.accounts.map((a) => [a.id, a.nombre]));
  return data.holdings
    .filter((h) => isValorAnotado(h.asset))
    .map((h) => {
      const last = lastValuation(data.valuations[h.id]);
      return {
        holdingId: h.id,
        portfolioId: h.portfolio_id,
        nombre: h.asset.nombre,
        detalle: [TIPO_LABEL[vehiculoOf(h.asset.tipo)], cuentas.get(h.account_id), carteras.get(h.portfolio_id)].filter(Boolean).join(' · '),
        valor: last?.valor ?? 0,
        aportado: last?.aportado ?? null,
        fecha: last?.fecha ?? null,
        pideAportado: pideAportado(h.asset.tipo),
      };
    })
    .sort((a, b) => b.valor - a.valor);
}
