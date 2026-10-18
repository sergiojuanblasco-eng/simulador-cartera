import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/** Usuario actual (o redirige a /login). Cacheado por petición. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { user, supabase };
});

export function isAdmin(email: string | undefined | null): boolean {
  return !!email && serverEnv.adminEmails().includes(email.toLowerCase());
}
