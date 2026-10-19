-- =============================================================================
-- Kartera · Migración 0008 · Comisión fija al año por producto (custodia, mantenimiento…)
-- Incluye también de la 0004 a la 0007 por si aún no se ejecutaron.
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

alter table public.holdings add column if not exists ter numeric(7,6);
alter table public.holdings drop constraint if exists holdings_ter_check;
alter table public.holdings add constraint holdings_ter_check check (ter is null or (ter >= 0 and ter < 0.2));

-- Nuevo vehículo: depósito a plazo
alter type public.asset_type add value if not exists 'deposito';

-- Valores anotados a mano: uno por producto y día
create table if not exists public.valuations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  holding_id  uuid not null references public.holdings (id) on delete cascade,
  fecha       date not null check (fecha >= date '1970-01-01'),
  valor       numeric(20,2) not null check (valor >= 0 and valor < 1e12),
  aportado    numeric(20,2) check (aportado is null or (aportado >= 0 and aportado < 1e12)),
  notas       text check (char_length(notas) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (holding_id, fecha)
);
create index if not exists valuations_user_fecha_idx on public.valuations (user_id, fecha);

-- Nunca mezclar datos de dos usuarios, venga la escritura de donde venga
create or replace function public.check_valuation_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.holdings h
                 where h.id = new.holding_id and h.user_id = new.user_id) then
    raise exception 'La posición no pertenece al usuario' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists valuations_check_owner on public.valuations;
create trigger valuations_check_owner
  before insert or update on public.valuations
  for each row execute function public.check_valuation_owner();

drop trigger if exists valuations_updated_at on public.valuations;
create trigger valuations_updated_at
  before update on public.valuations
  for each row execute function public.set_updated_at();

alter table public.valuations enable row level security;
drop policy if exists valuations_owner on public.valuations;
create policy valuations_owner on public.valuations
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.valuations to authenticated;
grant all on public.valuations to service_role;
revoke all on public.valuations from anon;

-- Comisión fija al año (EUR) de cada posición: custodia del banco, mantenimiento… aparte del TER
alter table public.holdings add column if not exists comision_fija numeric(10,2);
alter table public.holdings drop constraint if exists holdings_comision_fija_check;
alter table public.holdings add constraint holdings_comision_fija_check
  check (comision_fija is null or (comision_fija >= 0 and comision_fija < 100000));
