import type { Metadata } from 'next';
import { DeleteTxButton } from '@/components/delete-tx';
import { Card, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { loadUserData } from '@/lib/data';
import { eur, fechaCorta, qty } from '@/lib/format';
import { TX_LABEL, TX_TONE } from '@/lib/tx-labels';

export const metadata: Metadata = { title: 'Movimientos' };

export default async function MovimientosPage() {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const hs = new Map(data.holdings.map((h) => [h.id, h]));
  const ps = new Map(data.portfolios.map((p) => [p.id, p.nombre]));
  const txs = [...data.txs].reverse();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader back="/mas" title="Movimientos" subtitle={`${txs.length} operaciones`} action={<LinkButton href="/movimiento" variant="secondary">+ Nuevo</LinkButton>} />
      {txs.length === 0 ? <Card className="text-sm text-muted">Todavía no hay movimientos.</Card> : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {txs.map((t) => {
            const h = hs.get(t.holding_id);
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TX_TONE[t.tipo]}`}>{TX_LABEL[t.tipo]}</span>
                    <span className="truncate text-sm font-semibold">{h?.asset.nombre}</span>
                  </div>
                  <span className="text-xs text-muted">{fechaCorta(t.fecha)} · {h ? ps.get(h.portfolio_id) : ''} · {t.tipo === 'comision' && Number(t.cantidad) === 0 ? (t.notas ?? 'Cobrada en efectivo') : `${qty(Number(t.cantidad))} part.`}</span>
                </div>
                <span className="font-semibold tabular">{eur(Number(t.importe), 2)}</span>
                <DeleteTxButton id={t.id} grouped={!!t.grupo_id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
