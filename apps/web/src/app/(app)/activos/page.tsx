import type { Metadata } from 'next';
import Link from 'next/link';
import { TIPO_LABEL } from '@kartera/core';
import { Card, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { eur, eurSigned, pctSigned } from '@/lib/format';

export const metadata: Metadata = { title: 'Activos' };

export default async function ActivosPage() {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const result = compute(data);
  const pos = new Map(result.positions.map((p) => [p.holdingId, p]));
  const cuentas = new Map(data.accounts.map((a) => [a.id, a.nombre]));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Activos" subtitle="Tus productos, agrupados por cartera"
        action={<LinkButton href="/movimiento" className="lg:hidden" aria-label="Nuevo movimiento">+</LinkButton>} />
      {data.portfolios.length === 0 ? (
        <Card className="text-sm text-muted">Todavía no tienes carteras. <Link className="font-semibold text-brand" href="/carteras/nueva?primera=1">Crea la primera</Link>.</Card>
      ) : null}
      {data.portfolios.map((p) => {
        const hs = data.holdings.filter((h) => h.portfolio_id === p.id);
        const vivos = hs.filter((h) => (pos.get(h.id)?.cantidad ?? 0) > 1e-9).sort((a, b) => (pos.get(b.id)?.valor ?? 0) - (pos.get(a.id)?.valor ?? 0));
        const cerrados = hs.filter((h) => (pos.get(h.id)?.cantidad ?? 0) <= 1e-9);
        const total = vivos.reduce((a, h) => a + (pos.get(h.id)?.valor ?? 0), 0);
        return (
          <section key={p.id} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">{p.nombre}</h2>
              <span className="font-semibold tabular">{eur(total)}</span>
            </div>
            {vivos.length === 0 ? <p className="text-sm text-muted">Sin productos todavía.</p> : null}
            <ul className="flex flex-col gap-2">
              {vivos.map((h) => {
                const ps = pos.get(h.id)!;
                const up = ps.ganancia >= 0;
                return (
                  <li key={h.id}>
                    <Link href={`/activos/${h.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-line-strong">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-semibold">{h.asset.nombre}</span>
                        <span className="text-[13px] text-muted">{TIPO_LABEL[h.asset.tipo]} · {cuentas.get(h.account_id)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold tabular">{eur(ps.valor)}</span>
                        <span className={`text-[13px] font-semibold tabular ${up ? 'text-pos' : 'text-neg'}`}>{eurSigned(ps.ganancia)} · {pctSigned(ps.gananciaPct)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {cerrados.length ? (
              <details className="text-sm text-muted">
                <summary className="cursor-pointer py-1">{cerrados.length} producto{cerrados.length > 1 ? 's' : ''} vendido{cerrados.length > 1 ? 's' : ''}</summary>
                <ul className="mt-1 flex flex-col">
                  {cerrados.map((h) => <li key={h.id}><Link className="block py-2 text-brand" href={`/activos/${h.id}`}>{h.asset.nombre}</Link></li>)}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
