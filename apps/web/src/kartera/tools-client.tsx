'use client';

import { useRouter } from 'next/navigation';
import Tools from './Tools';

/**
 * Envoltorio del simulador original de Kartera para Next.js:
 * traduce su navegación propia (`go`) al router de Next.
 */
export function ToolsClient({ path, slug, loggedIn, embedded = false }: { path: string; slug?: string | null; loggedIn: boolean; embedded?: boolean }) {
  const router = useRouter();
  const go = (to: string) => router.push(to);
  return <Tools path={path} go={go} simSlug={slug ?? null} session={loggedIn ? { ok: true } : null} embedded={embedded} />;
}
