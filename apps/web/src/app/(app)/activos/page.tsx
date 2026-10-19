import type { Metadata } from 'next';
import Link from 'next/link';
import { CLASE_LABEL, TIPO_LABEL, vehiculoOf } from '@kartera/core';
import { claseOf } from '@/lib/asset-class';
import { Card, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { eur, eurSigned, fechaCorta, pctSigned } from '@/lib/format';
import { isValorAnotado } from '@/lib/db';

export const metadata: Metadata = { title: 'Activos' };

export default async function ActivosPage() {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const result = compute(data);
  const pos = new Map(result.positions.map((p) => [p.holdingId, p]));
  const cuentas = new Map(data.accounts.map((a) => [a.id, a.nombre]));
  const tieneSaldos = data.holdings.some((h) => isValorAnotado(h.asset));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Activos" subtitle="Tus productos, agrupados por cartera"
        action={<LinkButton href="/movimiento" className="lg:hidden" aria-label="Nuevo movimiento">+</LinkButton>} />
      <Link href="/saldos" className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 hover:border-line-strong">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal-ink" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M3 10 H21 M7 15 H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{tieneSaldos ? 'Actualizar saldos y valores' : 'Añade tus cuentas, planes y depósitos'}</span>
          <span className="text-[13px] text-muted">{tieneSaldos ? 'Cuentas, planes de pensiones y depósitos' : 'Para ver todo tu dinero en un sitio, no solo el del bróker'}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" stroke="#A1A1AA" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
      {data.portfolios.length === 0 ? (
        <Card className="text-sm text-muted">Todavía no tienes carteras. <Link className="font-semibold text-brand" href="/carteras/nueva?primera=1">Crea la primera</Link>.</Card>
      ) : null}
      {data.portfolios.map((p) => {
        const hs = data.holdings.filter((h) => h.portfolio_id === p.id);
        const vivo = (id: string) => {
          const ps = pos.get(id);
          return ps?.manual ? ps.valor > 0 || !ps.fechaPrecio : (ps?.cantidad ?? 0) > 1e-9;
        };
        const vivos = hs.filter((h) => vivo(h.id)).sort((a, b) => (pos.get(b.id)?.valor ?? 0) - (pos.get(a.id)?.valor ?? 0));
        const cerrados = hs.filter((h) => !vivo(h.id));
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
                const ps = pos.get(h.id) ?? { valor: 0, ganancia: 0, gananciaPct: null, manual: true, conAportado: false, fechaPrecio: null };
                const up = ps.ganancia >= 0;
                const anotado = !!ps.manual;
                return (
                  <li key={h.id}>
                    <Link href={`/activos/${h.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-line-strong">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate font-semibold">{h.asset.nombre}</span>
                        <span className="text-[13px] text-muted">
                          {anotado
                            ? <>{TIPO_LABEL[vehiculoOf(h.asset.tipo)]} · {cuentas.get(h.account_id)}{ps.fechaPrecio ? ` · anotado el ${fechaCorta(ps.fechaPrecio)}` : ''}</>
                            : <>{CLASE_LABEL[claseOf(h.clase, h.asset)]} · {TIPO_LABEL[vehiculoOf(h.asset.tipo)]} · {cuentas.get(h.account_id)}</>}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold tabular">{eur(ps.valor)}</span>
                        {anotado && !ps.conAportado ? (
                          <span className="text-[13px] text-muted">{h.asset.tipo === 'efectivo' ? 'Saldo' : 'Valor'}</span>
                        ) : (
                          <span className={`text-[13px] font-semibold tabular ${up ? 'text-pos' : 'text-neg'}`}>{eurSigned(ps.ganancia)} · {pctSigned(ps.gananciaPct)}</span>
                        )}
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
