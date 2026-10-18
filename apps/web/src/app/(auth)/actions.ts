'use server';

import { redirect } from 'next/navigation';
import { publicEnv } from '@/lib/env';
import { checkInvitation } from '@/lib/invitations';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { joinWaitlist } from '@/lib/waitlist';

export interface FormState {
  error?: string;
  ok?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authErrorEs(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Confirma tu email antes de entrar.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera unos minutos.';
  if (m.includes('already') && m.includes('registered')) return 'Ya existe una cuenta con ese email. Inicia sesión.';
  if (m.includes('password')) return 'La contraseña no es válida (mínimo 10 caracteres).';
  return 'Algo ha fallado. Inténtalo de nuevo.';
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!EMAIL_RE.test(email) || !password) return { error: 'Escribe tu email y tu contraseña.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorEs(error.message) };
  redirect('/');
}

/**
 * Registro por invitación.
 * El registro público está DESACTIVADO en Supabase: la cuenta solo se crea aquí,
 * en el servidor, tras validar el código. Así nadie puede saltarse la invitación
 * llamando a la API de Supabase directamente.
 */
export async function register(_: FormState, form: FormData): Promise<FormState> {
  const codigo = String(form.get('invitacion') ?? '');
  const nombre = String(form.get('nombre') ?? '').trim().slice(0, 80);
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const privacidad = form.get('privacidad') === 'on';

  if (!nombre) return { error: 'Dinos cómo quieres que te llamemos.' };
  if (!EMAIL_RE.test(email)) return { error: 'El email no parece válido.' };
  if (password.length < 10) return { error: 'La contraseña debe tener al menos 10 caracteres.' };
  if (!privacidad) return { error: 'Necesitas aceptar la política de privacidad.' };

  const inv = await checkInvitation(codigo);
  if (!inv.ok || !inv.id) return { error: inv.motivo ?? 'Invitación no válida.' };
  if (inv.email && inv.email.toLowerCase() !== email) {
    return { error: 'Esta invitación es para otro email.' };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (createError || !created.user) return { error: authErrorEs(createError?.message ?? '') };

  // Consumir la invitación de forma atómica (solo si nadie la ha usado entretanto).
  const { data: claimed } = await admin
    .from('invitations')
    .update({ usado_por: created.user.id, usado_en: new Date().toISOString() })
    .eq('id', inv.id)
    .is('usado_por', null)
    .select('id');
  if (!claimed || claimed.length === 0) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: 'Esta invitación acaba de usarse. Pide otra.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/login');
  redirect('/');
}

export async function recover(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim();
  if (!EMAIL_RE.test(email)) return { error: 'El email no parece válido.' };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${publicEnv.siteUrl()}/auth/callback?next=/nueva-contrasena`,
  });
  // Mismo mensaje exista o no la cuenta (no revelamos quién está registrado).
  return { ok: 'Si hay una cuenta con ese email, te hemos enviado un enlace para crear una contraseña nueva.' };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get('password') ?? '');
  if (password.length < 10) return { error: 'La contraseña debe tener al menos 10 caracteres.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'El enlace ha caducado. Pide uno nuevo.' };
  redirect('/');
}

export async function waitlist(_: FormState, form: FormData): Promise<FormState> {
  if (form.get('web')) return { ok: 'Apuntado.' }; // campo trampa para bots
  const r = await joinWaitlist(form.get('email'), form.get('origen'));
  if (!r.ok) return { error: r.error };
  return { ok: '¡Apuntado! Te escribiremos con tu invitación.' };
}
