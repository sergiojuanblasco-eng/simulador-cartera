-- =============================================================================
-- Kartera · Migración 0002 · Lista de espera
-- Emails de quien pide acceso desde la web (landing, «Avísame», registro sin invitación).
-- Solo la lee y escribe el servidor: RLS activada y SIN políticas.
-- =============================================================================
create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null check (char_length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  origen       text not null default 'web' check (char_length(origen) <= 40),
  invitado_en  timestamptz,
  created_at   timestamptz not null default now()
);

create unique index waitlist_email_uniq on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
