-- =============================================================================
-- Kartera · Migración 0005 · Clase de activo elegida por cada persona
-- (renta variable, renta fija, monetario…). Vacía = la deduce la app.
-- Incluye también la 0004 (cartera objetivo) por si aún no se ejecutó.
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

alter table public.holdings add column if not exists clase text;
alter table public.holdings drop constraint if exists holdings_clase_check;
alter table public.holdings add constraint holdings_clase_check
  check (clase is null or clase in ('rv', 'rf', 'monetario', 'materias_primas', 'cripto', 'inmobiliario', 'mixto', 'otros'));
