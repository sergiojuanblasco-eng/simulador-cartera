/** Variables de entorno con validación temprana y mensajes claros. */

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Revisa .env.local (ver .env.example).`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
};

export const serverEnv = {
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  adminEmails: () =>
    (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  eodhdKey: () => process.env.EODHD_API_KEY || null,
  benchmarkIsin: () => process.env.BENCHMARK_ISIN || 'IE00B4L5Y983',
  benchmarkSymbol: () => process.env.BENCHMARK_SYMBOL || 'EUNL.XETRA',
  cronSecret: () => process.env.CRON_SECRET || null,
  anthropicKey: () => process.env.ANTHROPIC_API_KEY || null,
  anthropicModel: () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
};
