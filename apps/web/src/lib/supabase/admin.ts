import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';

/**
 * Cliente con la clave de servicio: SE SALTA RLS.
 * Úsalo solo para tareas del sistema (invitaciones, catálogo global de activos,
 * precios, borrar cuenta). Nunca con datos que vengan sin validar del usuario.
 */
export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
