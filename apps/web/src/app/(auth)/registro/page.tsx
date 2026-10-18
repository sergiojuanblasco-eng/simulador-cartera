import type { Metadata } from 'next';
import { Alert, BackLink, H1, LinkButton } from '@/components/ui';
import { checkInvitation } from '@/lib/invitations';
import { RegisterForm, WaitlistForm } from '../forms';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ invitacion?: string }> }) {
  const { invitacion = '' } = await searchParams;

  // Sin invitación: lista de espera (aquí llegan los «Crear cuenta» de la landing).
  if (!invitacion) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <BackLink href="/" label="Volver al inicio" />
        <div className="flex flex-col gap-2">
          <H1>Pide tu acceso a Kartera</H1>
          <p className="text-[15px] leading-relaxed text-muted">
            Estamos en beta privada y gratuita. Déjanos tu email y te enviamos una invitación en cuanto haya hueco.
          </p>
        </div>
        <WaitlistForm origen="registro" />
        <LinkButton href="/login" variant="secondary">Ya tengo cuenta</LinkButton>
      </div>
    );
  }

  const inv = await checkInvitation(invitacion);
  return (
    <div className="flex flex-1 flex-col gap-6">
      <BackLink href="/login" label="Volver a iniciar sesión" />
      <div className="flex flex-col gap-2">
        <H1>Crea tu cuenta</H1>
        <p className="text-[15px] text-muted">Estamos en beta privada: solo se entra con invitación. Durante la beta es gratis.</p>
      </div>
      {inv.ok ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3.5">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="#16754E" strokeWidth="2" fill="none" /><path d="M8 12.5 L11 15 L16 9.5" stroke="#16754E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-brand-dark">Invitación válida</span>
              {inv.invitadoPor ? <span className="text-[13px] text-brand-dark">Te invita: {inv.invitadoPor}</span> : null}
            </div>
          </div>
          <RegisterForm invitacion={invitacion} email={inv.email} />
        </>
      ) : (
        <>
          <Alert>{inv.motivo}</Alert>
          <p className="text-sm text-muted-2">Si quieres, apúntate a la lista de espera y te enviamos una invitación nueva.</p>
          <WaitlistForm origen="registro" />
          <LinkButton href="/login" variant="secondary">Ya tengo cuenta</LinkButton>
        </>
      )}
    </div>
  );
}
