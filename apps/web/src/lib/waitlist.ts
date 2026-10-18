import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORIGENES = new Set(['landing', 'landing-app-movil', 'registro', 'simulador', 'web']);

/** Apunta un email en la lista de espera. Idempotente: repetir el mismo email no es un error. */
export async function joinWaitlist(rawEmail: unknown, rawOrigen: unknown): Promise<{ ok: boolean; error?: string }> {
  const email = String(rawEmail ?? '').trim().toLowerCase().slice(0, 254);
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'El email no parece válido.' };
  const origen = ORIGENES.has(String(rawOrigen)) ? String(rawOrigen) : 'web';
  const admin = createAdminClient();
  const { error } = await admin.from('waitlist').insert({ email, origen });
  if (error && error.code !== '23505') return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' };
  return { ok: true };
}
