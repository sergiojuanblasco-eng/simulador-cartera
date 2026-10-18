'use client';

import { useState, useTransition } from 'react';
import { deleteTransaction } from '@/app/(app)/actions';

export function DeleteTxButton({ id, grouped }: { id: string; grouped: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        aria-label="Borrar movimiento"
        onClick={() => {
          const msg = grouped ? '¿Borrar este movimiento y su pareja (traspaso o rebalanceo)?' : '¿Borrar este movimiento?';
          if (!confirm(msg)) return;
          start(async () => {
            const r = await deleteTransaction(id);
            if (!r.ok) setError(r.error ?? 'Error');
          });
        }}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-warn-bg hover:text-neg disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7 H19 M10 11 V17 M14 11 V17 M7 7 L8 19 H16 L17 7 M9 7 V4 H15 V7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {error ? <span role="alert" className="text-xs text-neg">{error}</span> : null}
    </span>
  );
}
