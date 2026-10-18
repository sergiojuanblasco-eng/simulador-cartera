import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** ¿Hay sesión? (para mostrar «Mi cartera» o «Entrar» en las páginas públicas). Nunca falla. */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  } catch {
    return false;
  }
}
