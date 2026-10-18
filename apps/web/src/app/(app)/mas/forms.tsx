'use client';

import { useActionState, useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { createInvitation, deleteAccount, refreshAllPrices, type IngestState } from './actions';

export function InviteForm() {
  const [state, action, pending] = useActionState(createInvitation, {});
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        <Field label="Email de la persona (opcional)" htmlFor="email" hint="Si lo pones, solo ese email podrá usar la invitación. Caduca en 30 días.">
          <Input id="email" name="email" type="email" placeholder="amiga@email.com" />
        </Field>
        <Button type="submit" disabled={pending}>{pending ? 'Creando…' : 'Crear enlace de invitación'}</Button>
      </form>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.link ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
          <span className="text-sm font-semibold">Enlace listo para compartir</span>
          <code className="break-all rounded-lg bg-subtle p-2 text-[13px]">{state.link}</code>
          <Button type="button" variant="secondary" onClick={async () => {
            try { await navigator.clipboard.writeText(state.link!); setCopied(true); } catch { setCopied(false); }
          }}>{copied ? '¡Copiado!' : 'Copiar enlace'}</Button>
        </div>
      ) : null}
    </div>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Escribe BORRAR para confirmar" htmlFor="confirmacion">
        <Input id="confirmacion" name="confirmacion" autoComplete="off" />
      </Field>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Button type="submit" variant="danger" disabled={pending}>{pending ? 'Borrando…' : 'Eliminar mi cuenta y mis datos'}</Button>
    </form>
  );
}

export function RefreshPricesButton() {
  const [state, setState] = useState<IngestState>({});
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={async () => {
        setPending(true);
        try { setState(await refreshAllPrices()); } finally { setPending(false); }
      }}>{pending ? 'Actualizando… (puede tardar un minuto)' : 'Actualizar precios ahora'}</Button>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.resumen ? (
        <Alert tone={state.resumen.errores.length ? 'warn' : 'ok'}>
          {!state.resumen.conEodhd ? 'Aún no hay clave de EODHD: solo se actualizan las cripto. ' : ''}
          {state.resumen.enlazados} productos enlazados con datos de mercado · {state.resumen.precios} precios nuevos de {state.resumen.activos} productos
          {state.resumen.ter ? ` · ${state.resumen.ter} TER añadidos` : ''}.
          {state.resumen.errores.length ? <span className="mt-1 block text-xs">Avisos: {state.resumen.errores.join(' · ')}</span> : null}
        </Alert>
      ) : null}
    </div>
  );
}
