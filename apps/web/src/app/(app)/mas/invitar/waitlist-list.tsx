'use client';

import { useState, useTransition } from 'react';
import { fechaCorta } from '@/lib/format';
import { inviteFromWaitlist } from '../actions';

interface Entry { id: string; email: string; origen: string; created_at: string; invitado_en: string | null }

export function WaitlistList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {entries.map((e) => <Row key={e.id} e={e} />)}
    </ul>
  );
}

function Row({ e }: { e: Entry }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{e.email}</span>
          <span className="text-xs text-muted">{fechaCorta(e.created_at.slice(0, 10))} · {e.origen}</span>
        </span>
        {e.invitado_en && !link ? (
          <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">Invitado</span>
        ) : !link ? (
          <button type="button" disabled={pending} className="min-h-11 shrink-0 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => start(async () => {
              const r = await inviteFromWaitlist(e.id);
              if (r.link) setLink(r.link); else setError(r.error ?? 'Error');
            })}>
            {pending ? 'Creando…' : 'Invitar'}
          </button>
        ) : null}
      </div>
      {link ? (
        <div className="flex flex-col gap-1.5">
          <code className="break-all rounded-lg bg-subtle p-2 text-xs">{link}</code>
          <button type="button" className="self-start py-1 text-sm font-semibold text-brand" onClick={async () => {
            try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
          }}>{copied ? '¡Copiado! Envíaselo por email o WhatsApp' : 'Copiar enlace'}</button>
        </div>
      ) : null}
      {error ? <span role="alert" className="text-xs text-neg">{error}</span> : null}
    </li>
  );
}
