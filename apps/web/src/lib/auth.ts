import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export interface AppUser {
  id: string;
  email: string | undefined;
  user_metadata: Record<string, unknown>;
}

/**
 * Usuario actual (o redirige a /login). Cacheado por petición.
 * getClaims verifica el token de sesión en local (sin ir al servidor de Auth) cuando el proyecto
 * usa claves de firma asimétricas; si no, hace la misma comprobación que getUser.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) redirect('/login');
  const user: AppUser = {
    id: c.sub,
    email: typeof c.email === 'string' ? c.email : undefined,
    user_metadata: (c.user_metadata as Record<string, unknown> | undefined) ?? {},
  };
  return { user, supabase };
});

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && serverEnv.adminEmails().includes(email.toLowerCase());
}
