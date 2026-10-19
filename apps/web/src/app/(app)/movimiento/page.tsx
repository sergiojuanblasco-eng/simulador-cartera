import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { H1 } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { parsePlan } from '@/lib/plan';

export const metadata: Metadata = { title: 'Nuevo movimiento' };

const ACTIONS = [
  { href: '/movimiento/aportacion', icon: '+', name: 'Aportación', sub: 'Meter dinero nuevo en un producto', bg: 'bg-brand-soft', fg: 'text-brand-dark' },
  { href: '/movimiento/retirada', icon: '−', name: 'Retirada', sub: 'Vender o sacar dinero de un producto', bg: 'bg-warn-bg', fg: 'text-warn-ink' },
  { href: '/movimiento/rebalanceo', icon: '⇄', name: 'Rebalanceo', sub: 'Mover dinero entre productos, sin aportar nada nuevo', bg: 'bg-teal-soft', fg: 'text-teal-ink' },
  { href: '/movimiento/comision', icon: '%', name: 'Comisión', sub: 'Custodia o mantenimiento que te cobra el banco o el bróker', bg: 'bg-subtle', fg: 'text-muted-2' },
  { href: '/saldos', icon: '≡', name: 'Saldos de cuentas y planes', sub: 'Anotar lo que tienes en el banco, tu plan de pensiones o un depósito', bg: 'bg-teal-soft', fg: 'text-teal-ink' },
  { href: '/carteras/nueva', icon: '◎', name: 'Nueva cartera', sub: 'Crear un objetivo nuevo: largo plazo, colchón…', bg: 'bg-subtle', fg: 'text-muted-2' },
];

export default async function MovimientoMenu() {
  const { supabase } = await requireUser();
  const { data: carteras } = await supabase.from('portfolios').select('*').order('orden').order('created_at');
  if (!carteras?.length) redirect('/carteras/nueva?primera=1');
  const conPlan = carteras.filter((c) => parsePlan(c.reparto_objetivo).length > 0).slice(0, 3);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <H1>¿Qué quieres registrar?</H1>
        <p className="text-sm text-muted">Elige el tipo de movimiento.</p>
      </div>
      {conPlan.length ? (
        <ul className="flex flex-col gap-2.5">
          {conPlan.map((c) => (
            <li key={c.id}>
              <Link href={`/carteras/${c.id}/invertir`} className="flex min-h-[76px] items-center gap-3.5 rounded-2xl border-2 border-brand bg-surface px-4 py-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-[20px] font-bold text-white" aria-hidden="true">◔</span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="font-semibold">Invertir según mi plan{conPlan.length > 1 ? `: ${c.nombre}` : ''}</span>
                  <span className="text-[13px] leading-snug text-muted">Te decimos cuánto poner en cada producto</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" stroke="#A1A1AA" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="flex flex-col gap-2.5">
        {ACTIONS.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="flex min-h-[76px] items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 hover:border-line-strong">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px] font-bold ${a.bg} ${a.fg}`} aria-hidden="true">{a.icon}</span>
              <span className="flex flex-1 flex-col gap-0.5"><span className="font-semibold">{a.name}</span><span className="text-[13px] leading-snug text-muted">{a.sub}</span></span>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" stroke="#A1A1AA" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/importar" className="self-center py-2 text-sm font-semibold text-brand">O importa un archivo de tu bróker →</Link>
    </div>
  );
}
