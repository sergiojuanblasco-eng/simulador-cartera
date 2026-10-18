-- =============================================================================
-- Kartera · Migración 0004 · Cartera objetivo (plan de cada cartera)
-- reparto_objetivo: [{ "assetId": uuid, "pct": 0–100, "proxy": "msci_world" }, …]
-- aportacion_mensual: lo que la persona piensa aportar cada mes (DCA).
-- Es seguro ejecutarla más de una vez.
-- =============================================================================
alter table public.portfolios
  add column if not exists aportacion_mensual numeric(14,2),
  add column if not exists reparto_objetivo jsonb not null default '[]'::jsonb;

alter table public.portfolios drop constraint if exists portfolios_aportacion_mensual_check;
alter table public.portfolios add constraint portfolios_aportacion_mensual_check
  check (aportacion_mensual is null or (aportacion_mensual >= 0 and aportacion_mensual < 10000000));

alter table public.portfolios drop constraint if exists portfolios_reparto_objetivo_check;
alter table public.portfolios add constraint portfolios_reparto_objetivo_check
  check (jsonb_typeof(reparto_objetivo) = 'array' and jsonb_array_length(reparto_objetivo) <= 50);
