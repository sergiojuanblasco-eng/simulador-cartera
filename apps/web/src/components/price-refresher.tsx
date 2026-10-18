'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const KEY = 'kartera_precios_at';
const EVERY_MS = 5 * 60_000;

/** Al abrir la app pide precios nuevos (como mucho cada 5 minutos) y, si hay, repinta la pantalla. */
export function PriceRefresher() {
  const router = useRouter();
  useEffect(() => {
    let last = 0;
    try { last = Number(sessionStorage.getItem(KEY) ?? 0); } catch { /* sin almacenamiento */ }
    if (Date.now() - last < EVERY_MS) return;
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* sin almacenamiento */ }
    let alive = true;
    fetch('/api/precios/actualizar', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { actualizados?: number } | null) => { if (alive && j?.actualizados) router.refresh(); })
      .catch(() => {});
    return () => { alive = false; };
  }, [router]);
  return null;
}
