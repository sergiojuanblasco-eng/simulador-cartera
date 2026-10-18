'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdmin, requireUser } from '@/lib/auth';
import { publicEnv, serverEnv } from '@/lib/env';
import { runDailyIngest } from '@/lib/market/ingest';
import { newInvitationCode } from '@/lib/invitations';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createInvitation(_: unknown, form: FormData): Promise<{ link?: string; error?: string }> {
  const { user } = await requireUser();
  if (!isAdmin(user.email)) return { error: 'No tienes permiso para invitar.' };
  const email = String(form.get('email') ?? '').trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no parece válido.' };
  const codigo = newInvitationCode();
  const expira = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from('invitations').insert({ codigo, email, invitado_por: user.id, expira_en: expira });
  if (error) return { error: 'No se pudo crear la invitación.' };
  return { link: `${publicEnv.siteUrl()}/registro?invitacion=${codigo}` };
}

export async function deleteAccount(_: unknown, form: FormData): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();
  if (String(form.get('confirmacion') ?? '').trim().toUpperCase() !== 'BORRAR') {
    return { error: 'Escribe BORRAR para confirmar.' };
  }
  const admin = createAdminClient();
  // Borra el usuario: en cascada se eliminan perfil, carteras, operaciones y productos propios.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: 'No se pudo borrar la cuenta. Escríbenos.' };
  await supabase.auth.signOut();
  redirect('/login');
}

/** Invita a alguien de la lista de espera: crea su invitación y devuelve el enlace para enviárselo. */
export async function inviteFromWaitlist(id: string): Promise<{ link?: string; error?: string }> {
  const { user } = await requireUser();
  if (!isAdmin(user.email)) return { error: 'No tienes permiso para invitar.' };
  const admin = createAdminClient();
  const { data: w } = await admin.from('waitlist').select('id, email').eq('id', id).maybeSingle();
  if (!w) return { error: 'Ya no está en la lista.' };
  const codigo = newInvitationCode();
  const expira = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const { error } = await admin.from('invitations').insert({ codigo, email: w.email, invitado_por: user.id, expira_en: expira });
  if (error) return { error: 'No se pudo crear la invitación.' };
  await admin.from('waitlist').update({ invitado_en: new Date().toISOString() }).eq('id', id);
  return { link: `${publicEnv.siteUrl()}/registro?invitacion=${codigo}` };
}

export interface IngestState {
  ok?: boolean;
  error?: string;
  resumen?: { activos: number; precios: number; enlazados: number; ter: number; tiposCambio: number; errores: string[]; conEodhd: boolean };
}

/** Admin: lanza ahora el proceso de precios (enlaza productos con EODHD, descarga históricos, TER y divisas). */
export async function refreshAllPrices(): Promise<IngestState> {
  const { user } = await requireUser();
  if (!isAdmin(user.email)) return { error: 'Solo para administradores.' };
  try {
    const s = await runDailyIngest({ force: true });
    revalidatePath('/', 'layout');
    return { ok: true, resumen: { ...s, errores: s.errores.slice(0, 10), conEodhd: !!serverEnv.eodhdKey() } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
