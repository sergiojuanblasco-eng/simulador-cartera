import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, PageHeader } from '@/components/ui';
import { isAdmin, requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Más' };

function Row({ href, title, sub, external }: { href: string; title: string; sub?: string; external?: boolean }) {
  const inner = (
    <>
      <span className="flex min-w-0 flex-1 flex-col"><span className="font-semibold">{title}</span>{sub ? <span className="text-[13px] text-muted">{sub}</span> : null}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" stroke="#A1A1AA" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </>
  );
  const cls = 'flex min-h-[60px] items-center gap-3 px-4 py-3 hover:bg-subtle';
  return <li>{external ? <a href={href} className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>}</li>;
}

export default async function MasPage() {
  const { user } = await requireUser();
  const nombre = (user.user_metadata?.nombre as string | undefined) ?? '';
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Más" />
      <Card className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft font-display text-lg font-bold text-brand-dark">{(nombre || user.email || '?').slice(0, 1).toUpperCase()}</span>
        <div className="flex min-w-0 flex-col"><span className="font-semibold">{nombre}</span><span className="truncate text-sm text-muted">{user.email}</span></div>
      </Card>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <Row href="/carteras" title="Mis carteras" sub="Nombres, objetivos e importes meta" />
        <Row href="/movimientos" title="Historial de movimientos" sub="Revisa o borra operaciones" />
        <Row href="/importar" title="Importar movimientos" sub="MyInvestor, Trade Republic, Excel o IA" />
        <Row href="/simulador-cartera" title="Simulador de cartera" sub="31 activos, 36 años de datos y 3 escenarios" />
        <Row href="/interes-compuesto" title="Calculadora de interés compuesto" />
        {isAdmin(user.email) ? <Row href="/mas/invitar" title="Invitaciones y lista de espera" sub="Crea enlaces e invita a quien lo ha pedido" /> : null}
      </ul>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <Row href="/api/exportar" external title="Descargar mis datos" sub="Todas tus operaciones en CSV (copia de seguridad)" />
        <Row href="/privacidad" title="Privacidad" />
        <Row href="/mas/cuenta" title="Eliminar mi cuenta" sub="Borra todos tus datos para siempre" />
      </ul>

      <form action="/auth/salir" method="post">
        <button type="submit" className="min-h-12 w-full rounded-xl border border-line-strong bg-surface font-semibold">Cerrar sesión</button>
      </form>
      <p className="text-center text-xs text-muted">Kartera muestra información; no es asesoramiento financiero.</p>
    </div>
  );
}
