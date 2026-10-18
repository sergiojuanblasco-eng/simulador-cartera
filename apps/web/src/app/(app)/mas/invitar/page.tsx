import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { isAdmin, requireUser } from '@/lib/auth';
import { fechaCorta } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { InviteForm } from '../forms';
import { WaitlistList } from './waitlist-list';

export const metadata: Metadata = { title: 'Invitar' };

export default async function InvitarPage() {
  const { user } = await requireUser();
  if (!isAdmin(user.email)) notFound();
  const admin = createAdminClient();
  const { data: invs } = await admin.from('invitations')
    .select('id, email, usado_por, usado_en, expira_en, created_at')
    .eq('invitado_por', user.id).order('created_at', { ascending: false }).limit(30);
  const { data: lista } = await admin.from('waitlist')
    .select('id, email, origen, created_at, invitado_en')
    .order('invitado_en', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true }).limit(200);
  const pendientes = (lista ?? []).filter((w) => !w.invitado_en).length;

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageHeader back="/mas" title="Invitaciones" subtitle="Cada enlace sirve para crear una cuenta" />
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-[22px]">Lista de espera <span className="font-sans text-sm text-muted">· {pendientes} pendiente{pendientes === 1 ? '' : 's'}</span></h2>
        {lista?.length ? <WaitlistList entries={lista} /> : <p className="text-sm text-muted">Nadie en la lista todavía. Aquí aparecerá quien pida acceso desde la web.</p>}
      </section>
      <h2 className="font-display text-[22px]">Invitar a alguien más</h2>
      <InviteForm />
      {invs?.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[22px]">Tus invitaciones</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {invs.map((i) => {
              const caducada = !i.usado_por && i.expira_en && new Date(i.expira_en) < new Date();
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">{i.email ?? 'Cualquier email'} · {fechaCorta(String(i.created_at).slice(0, 10))}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${i.usado_por ? 'bg-teal-soft text-teal-ink' : caducada ? 'bg-subtle text-muted' : 'bg-brand-soft text-brand-dark'}`}>
                    {i.usado_por ? 'Usada' : caducada ? 'Caducada' : 'Pendiente'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
