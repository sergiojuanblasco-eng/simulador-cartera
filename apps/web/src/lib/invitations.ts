import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface InvitationCheck {
  ok: boolean;
  id?: string;
  email?: string | null;
  invitadoPor?: string | null;
  motivo?: string;
}

/** Comprueba un código de invitación (sin consumirlo). */
export async function checkInvitation(codigo: string | undefined | null): Promise<InvitationCheck> {
  const code = (codigo ?? '').trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(code)) return { ok: false, motivo: 'Necesitas un enlace de invitación válido.' };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('invitations')
    .select('id, email, usado_por, expira_en, invitado_por, profiles:invitado_por (nombre)')
    .eq('codigo', code)
    .maybeSingle();
  if (error || !data) return { ok: false, motivo: 'Esta invitación no existe.' };
  if (data.usado_por) return { ok: false, motivo: 'Esta invitación ya se ha usado.' };
  if (data.expira_en && new Date(data.expira_en) < new Date()) return { ok: false, motivo: 'Esta invitación ha caducado.' };
  const inviter = data.profiles as unknown as { nombre: string | null } | null;
  return { ok: true, id: data.id, email: data.email, invitadoPor: inviter?.nombre ?? null };
}

/** Genera un código aleatorio difícil de adivinar (18 caracteres). */
export function newInvitationCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
