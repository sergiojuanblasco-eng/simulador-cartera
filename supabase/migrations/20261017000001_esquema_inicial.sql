-- =============================================================================
-- Kartera · Migración 0001 · Esquema inicial
-- -----------------------------------------------------------------------------
-- Convenciones:
--   * Dinero:      NUMERIC(20,2) en la moneda de la operación. Nunca float.
--   * Precios:     NUMERIC(20,8)  (valores liquidativos con muchos decimales).
--   * Cantidades:  NUMERIC(28,10) (participaciones de fondos y fracciones cripto).
--   * Importes SIEMPRE positivos: el sentido lo da el tipo de operación.
--   * Toda tabla con datos de usuario lleva user_id + RLS (user_id = auth.uid()).
--   * Las posiciones NO se guardan: se derivan de las operaciones (vista).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.asset_type as enum (
  'fondo', 'etf', 'accion', 'cripto', 'monetario', 'plan_pensiones', 'efectivo', 'otro'
);

-- compra/venta = "aportación"/"retirada" en la interfaz.
-- traspaso_salida + traspaso_entrada = rebalanceo por traspaso (mismo grupo_id):
-- conserva fecha y coste de compra original, no tributa, no es aportación nueva.
create type public.tx_type as enum (
  'compra', 'venta', 'traspaso_salida', 'traspaso_entrada', 'dividendo', 'comision'
);

create type public.portfolio_goal as enum (
  'largo_plazo', 'medio_plazo', 'corto_plazo', 'colchon',
  'especulativo', 'plan_pensiones', 'personalizado'
);

create type public.sub_plan      as enum ('free', 'pro');
create type public.sub_status    as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.import_source as enum ('manual', 'myinvestor', 'trade_republic', 'excel', 'ia');
create type public.import_status as enum ('pendiente', 'revision', 'completado', 'error');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- 1. USUARIOS Y NEGOCIO
-- =============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  nombre       text check (char_length(nombre) <= 80),
  moneda_base  char(3) not null default 'EUR' check (moneda_base ~ '^[A-Z]{3}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Beta por invitación. Solo se lee/escribe desde el servidor (service_role).
create table public.invitations (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique check (char_length(codigo) between 8 and 64),
  email         text,
  invitado_por  uuid references public.profiles (id) on delete set null,
  usado_por     uuid references public.profiles (id) on delete set null,
  usado_en      timestamptz,
  expira_en     timestamptz,
  created_at    timestamptz not null default now()
);

-- Estado de pago. Solo lo escribe el webhook de Stripe (service_role).
create table public.subscriptions (
  user_id                 uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  plan                    public.sub_plan   not null default 'free',
  estado                  public.sub_status not null default 'active',
  periodo_fin             timestamptz,
  updated_at              timestamptz not null default now()
);

-- =============================================================================
-- 2. CATÁLOGO DE MERCADO
-- =============================================================================
-- owner_id NULL  → activo global (lo carga el sistema desde el proveedor de datos).
-- owner_id = uid → activo propio del usuario (p. ej. cuenta remunerada o un fondo
--                  que el proveedor no cubre, con precio manual).
create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles (id) on delete cascade,
  isin         text check (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  ticker       text,
  nombre       text not null check (char_length(nombre) between 1 and 200),
  tipo         public.asset_type not null,
  moneda       char(3) not null default 'EUR' check (moneda ~ '^[A-Z]{3}$'),
  ter          numeric(7,6) check (ter >= 0 and ter < 0.2),  -- fracción: 0.0012 = 0,12 %
  proveedor    text,          -- 'eodhd', 'coingecko', 'manual'…
  proveedor_id text,          -- símbolo en el proveedor (p. ej. 'IE00BYX5NX33.EUFUND')
  metadata     jsonb not null default '{}'::jsonb,  -- top10, geografía, sectores…
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Un ISIN global aparece una sola vez; los activos propios pueden repetirlo.
create unique index assets_isin_global_uniq on public.assets (isin)
  where owner_id is null and isin is not null;
create unique index assets_proveedor_uniq on public.assets (proveedor, proveedor_id)
  where proveedor_id is not null;
create index assets_owner_idx on public.assets (owner_id) where owner_id is not null;
create index assets_nombre_idx on public.assets (lower(nombre));

create table public.asset_prices (
  asset_id  uuid not null references public.assets (id) on delete cascade,
  fecha     date not null,
  precio    numeric(20,8) not null check (precio > 0),
  fuente    text not null default 'proveedor',
  primary key (asset_id, fecha)
);

-- Tipos de cambio del BCE: unidades de "moneda" por 1 EUR.
create table public.fx_rates (
  fecha        date not null,
  moneda       char(3) not null check (moneda ~ '^[A-Z]{3}$'),
  tipo_vs_eur  numeric(20,10) not null check (tipo_vs_eur > 0),
  primary key (fecha, moneda)
);

-- =============================================================================
-- 3. DATOS DEL USUARIO
-- =============================================================================
-- Carteras por objetivo: "Largo plazo", "Colchón", "Plan de pensiones"…
create table public.portfolios (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nombre            text not null check (char_length(nombre) between 1 and 60),
  objetivo          public.portfolio_goal not null default 'personalizado',
  objetivo_importe  numeric(20,2) check (objetivo_importe > 0),
  objetivo_anio     smallint check (objetivo_anio between 2000 and 2100),
  color             text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  orden             integer not null default 0,
  archivada         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, nombre)
);

-- Dónde está el dinero: MyInvestor, Trade Republic, banco…
create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 60),
  entidad     text,
  moneda      char(3) not null default 'EUR' check (moneda ~ '^[A-Z]{3}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, nombre)
);

-- "Este producto, dentro de esta cartera, en este bróker".
create table public.holdings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete restrict,
  asset_id      uuid not null references public.assets (id) on delete restrict,
  created_at    timestamptz not null default now(),
  unique (portfolio_id, account_id, asset_id)
);

create table public.imports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  origen        public.import_source not null,
  fichero_path  text,                                -- ruta en Supabase Storage
  estado        public.import_status not null default 'pendiente',
  resumen       jsonb not null default '{}'::jsonb,  -- {nuevas, duplicadas, a_revisar}
  created_at    timestamptz not null default now()
);

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  holding_id  uuid not null references public.holdings (id) on delete cascade,
  tipo        public.tx_type not null,
  fecha       date not null check (fecha >= date '1970-01-01'),
  cantidad    numeric(28,10) not null default 0 check (cantidad >= 0),  -- participaciones
  precio      numeric(20,8)  check (precio >= 0),                        -- por participación
  importe     numeric(20,2)  not null check (importe >= 0),              -- sin comisión
  comision    numeric(20,2)  not null default 0 check (comision >= 0),
  moneda      char(3) not null default 'EUR' check (moneda ~ '^[A-Z]{3}$'),
  fx_eur      numeric(20,10) not null default 1 check (fx_eur > 0),      -- moneda por 1 EUR ese día
  grupo_id    uuid,          -- une las dos patas de un traspaso
  import_id   uuid references public.imports (id) on delete set null,
  hash        text,          -- huella para detectar duplicados al reimportar
  notas       text check (char_length(notas) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint traspaso_requiere_grupo check (
    tipo not in ('traspaso_salida', 'traspaso_entrada') or grupo_id is not null
  ),
  constraint compra_venta_con_cantidad check (
    tipo not in ('compra', 'venta', 'traspaso_salida', 'traspaso_entrada') or cantidad > 0
  ),
  unique (user_id, hash)
);

create index transactions_holding_fecha_idx on public.transactions (holding_id, fecha);
create index transactions_user_fecha_idx    on public.transactions (user_id, fecha);
create index transactions_grupo_idx         on public.transactions (grupo_id) where grupo_id is not null;
create index holdings_user_idx              on public.holdings (user_id);
create index holdings_portfolio_idx         on public.holdings (portfolio_id);

-- =============================================================================
-- 4. CALCULADO (lo escribe el proceso nocturno con service_role)
-- =============================================================================
-- portfolio_id NULL = patrimonio total del usuario.
create table public.snapshots (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  portfolio_id  uuid references public.portfolios (id) on delete cascade,
  fecha         date not null,
  valor         numeric(20,2) not null,
  aportado      numeric(20,2) not null,
  desglose      jsonb not null default '{}'::jsonb,
  constraint snapshots_uniq unique nulls not distinct (user_id, portfolio_id, fecha)
);

create index snapshots_user_fecha_idx on public.snapshots (user_id, fecha);

-- =============================================================================
-- 5. INTEGRIDAD ENTRE TABLAS
-- -----------------------------------------------------------------------------
-- RLS protege frente al cliente, pero el servidor (service_role) se la salta.
-- Estos triggers garantizan que NUNCA se mezclen datos de dos usuarios,
-- venga la escritura de donde venga.
-- =============================================================================
create or replace function public.check_holding_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.portfolios p
                 where p.id = new.portfolio_id and p.user_id = new.user_id) then
    raise exception 'La cartera no pertenece al usuario' using errcode = '42501';
  end if;
  if not exists (select 1 from public.accounts a
                 where a.id = new.account_id and a.user_id = new.user_id) then
    raise exception 'La cuenta no pertenece al usuario' using errcode = '42501';
  end if;
  if not exists (select 1 from public.assets s
                 where s.id = new.asset_id and (s.owner_id is null or s.owner_id = new.user_id)) then
    raise exception 'Activo no disponible para el usuario' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger holdings_check_owner
  before insert or update on public.holdings
  for each row execute function public.check_holding_owner();

create or replace function public.check_transaction_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.holdings h
                 where h.id = new.holding_id and h.user_id = new.user_id) then
    raise exception 'La posición no pertenece al usuario' using errcode = '42501';
  end if;
  if new.import_id is not null and not exists (
       select 1 from public.imports i where i.id = new.import_id and i.user_id = new.user_id) then
    raise exception 'La importación no pertenece al usuario' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger transactions_check_owner
  before insert or update on public.transactions
  for each row execute function public.check_transaction_owner();

-- updated_at automático
create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger assets_updated_at        before update on public.assets        for each row execute function public.set_updated_at();
create trigger portfolios_updated_at    before update on public.portfolios    for each row execute function public.set_updated_at();
create trigger accounts_updated_at      before update on public.accounts      for each row execute function public.set_updated_at();
create trigger transactions_updated_at  before update on public.transactions  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. ALTA DE USUARIO
-- -----------------------------------------------------------------------------
-- Al registrarse en Supabase Auth se crea su perfil y su suscripción (gratis
-- durante la beta). La validación del código de invitación se hace ANTES,
-- en el servidor (siguiente módulo), para que nadie se registre sin invitación.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''));

  insert into public.subscriptions (user_id, plan, estado)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 7. VISTA DE POSICIONES (derivadas, nunca almacenadas)
-- -----------------------------------------------------------------------------
-- security_invoker = true → la vista respeta la RLS de quien consulta.
-- El coste fiscal FIFO y el valor de mercado los calcula el motor (paquete core).
-- =============================================================================
create view public.v_positions
with (security_invoker = true)
as
select
  h.id            as holding_id,
  h.user_id,
  h.portfolio_id,
  h.account_id,
  h.asset_id,
  coalesce(sum(case
    when t.tipo in ('compra', 'traspaso_entrada') then  t.cantidad
    when t.tipo in ('venta',  'traspaso_salida')  then -t.cantidad
    else 0 end), 0)::numeric(28,10)                          as cantidad,
  coalesce(sum(case when t.tipo = 'compra' then t.importe + t.comision else 0 end), 0)
    ::numeric(20,2)                                          as total_comprado,
  coalesce(sum(case when t.tipo = 'venta'  then t.importe - t.comision else 0 end), 0)
    ::numeric(20,2)                                          as total_vendido,
  min(t.fecha)                                               as primera_operacion
from public.holdings h
left join public.transactions t on t.holding_id = h.id
group by h.id;

-- =============================================================================
-- 8. SEGURIDAD A NIVEL DE FILA (RLS)
-- -----------------------------------------------------------------------------
-- (select auth.uid()) en vez de auth.uid(): Postgres lo evalúa una vez por
-- consulta y no por fila (recomendación de rendimiento de Supabase).
-- Tabla sin política para un rol = acceso denegado para ese rol.
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.invitations   enable row level security;
alter table public.subscriptions enable row level security;
alter table public.assets        enable row level security;
alter table public.asset_prices  enable row level security;
alter table public.fx_rates      enable row level security;
alter table public.portfolios    enable row level security;
alter table public.accounts      enable row level security;
alter table public.holdings      enable row level security;
alter table public.imports       enable row level security;
alter table public.transactions  enable row level security;
alter table public.snapshots     enable row level security;

-- Perfil: cada uno lee y edita el suyo. El alta la hace el trigger.
create policy profiles_select on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Invitaciones: sin políticas → solo el servidor.

-- Suscripción: solo lectura de la propia. La escribe el webhook de Stripe.
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- Catálogo: activos globales + los propios. El usuario solo crea/edita los suyos.
create policy assets_select on public.assets
  for select to authenticated using (owner_id is null or owner_id = (select auth.uid()));
create policy assets_insert on public.assets
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy assets_update on public.assets
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy assets_delete on public.assets
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Precios: se ven los de activos visibles; precio manual solo en activos propios.
create policy asset_prices_select on public.asset_prices
  for select to authenticated using (exists (
    select 1 from public.assets a where a.id = asset_id
      and (a.owner_id is null or a.owner_id = (select auth.uid()))));
create policy asset_prices_write on public.asset_prices
  for all to authenticated
  using (exists (select 1 from public.assets a where a.id = asset_id and a.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.assets a where a.id = asset_id and a.owner_id = (select auth.uid())));

create policy fx_rates_select on public.fx_rates
  for select to authenticated using (true);

-- Datos propios: todo permitido sobre lo suyo, nada sobre lo ajeno.
create policy portfolios_owner on public.portfolios
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy accounts_owner on public.accounts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy holdings_owner on public.holdings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy imports_owner on public.imports
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy transactions_owner on public.transactions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Snapshots: solo lectura. Los escribe el proceso nocturno.
create policy snapshots_select on public.snapshots
  for select to authenticated using (user_id = (select auth.uid()));

-- Los anónimos (sin sesión) no ven nada de la app.
revoke all on all tables in schema public from anon;
