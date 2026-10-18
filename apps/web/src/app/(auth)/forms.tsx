'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { login, recover, register, updatePassword, waitlist, type FormState } from './actions';

const initial: FormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </Field>
      <Link href="/recuperar" className="-mt-1 self-end py-1.5 text-sm font-medium text-brand">¿Olvidaste tu contraseña?</Link>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</Button>
    </form>
  );
}

export function RegisterForm({ invitacion, email }: { invitacion: string; email?: string | null }) {
  const [state, action, pending] = useActionState(register, initial);
  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="invitacion" value={invitacion} />
      <Field label="Nombre" htmlFor="nombre">
        <Input id="nombre" name="nombre" autoComplete="given-name" placeholder="Cómo quieres que te llamemos" required maxLength={80} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" defaultValue={email ?? ''} required />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 10 caracteres" minLength={10} required />
      </Field>
      <div className="flex items-start gap-2.5 pt-1">
        <input id="privacidad" name="privacidad" type="checkbox" className="mt-0.5 h-5 w-5 accent-brand" required />
        <label htmlFor="privacidad" className="text-sm leading-relaxed text-muted-2">
          Acepto la <Link href="/privacidad" className="text-brand">política de privacidad</Link>. Mis datos se guardan en servidores de la UE y puedo borrarlos cuando quiera.
        </label>
      </div>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} className="mt-2">{pending ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
    </form>
  );
}

export function RecoverForm() {
  const [state, action, pending] = useActionState(recover, initial);
  if (state.ok) return <Alert tone="ok">{state.ok}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Enviando…' : 'Enviar enlace'}</Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nueva contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mínimo 10 caracteres" minLength={10} required />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar contraseña'}</Button>
    </form>
  );
}

export function WaitlistForm({ origen }: { origen: string }) {
  const [state, action, pending] = useActionState(waitlist, initial);
  if (state.ok) return <Alert tone="ok">{state.ok}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="origen" value={origen} />
      <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <Field label="Email" htmlFor="wl-email">
        <Input id="wl-email" name="email" type="email" autoComplete="email" placeholder="tu@email.com" required />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Enviando…' : 'Pedir mi invitación'}</Button>
      <p className="text-xs text-muted">Solo usaremos tu email para enviarte la invitación.</p>
    </form>
  );
}
