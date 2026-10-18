-- Prueba de aislamiento entre usuarios y reglas de integridad.
-- Ana = 1111…, Bea = 2222…  Cada bloque DO falla (raise) si algo no se cumple.
\set ON_ERROR_STOP on

-- Alta de dos usuarios (el trigger crea perfil + suscripción)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.es', '{"nombre":"Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'bea@test.es', '{"nombre":"Bea"}');

-- Activo global (lo carga el sistema)
insert into public.assets (id, isin, nombre, tipo, ter, proveedor, proveedor_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'IE00BYX5NX33', 'Fidelity MSCI World Index Fund',
   'fondo', 0.0012, 'eodhd', 'IE00BYX5NX33.EUFUND');
insert into public.asset_prices (asset_id, fecha, precio) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-16', 11.23456789);

-- ---------- Como Ana ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.portfolios (id, nombre, objetivo) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Largo plazo', 'largo_plazo');
insert into public.accounts (id, nombre, entidad) values
  ('cccccccc-0000-0000-0000-000000000001', 'MyInvestor', 'MyInvestor');
insert into public.holdings (id, portfolio_id, account_id, asset_id) values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.transactions (holding_id, tipo, fecha, cantidad, precio, importe, hash) values
  ('dddddddd-0000-0000-0000-000000000001', 'compra', '2026-01-15', 26.7, 11.2359, 300.00, 'h1'),
  ('dddddddd-0000-0000-0000-000000000001', 'compra', '2026-02-15', 25.9, 11.5830, 300.00, 'h2'),
  ('dddddddd-0000-0000-0000-000000000001', 'venta',  '2026-06-01', 10.0, 11.9000, 119.00, 'h3');

do $$
declare n numeric;
begin
  select cantidad into n from public.v_positions;
  if n <> 42.6 then raise exception 'Posición incorrecta: %', n; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'Ana ve perfiles ajenos'; end if;
  if (select plan from public.subscriptions) <> 'free' then raise exception 'Suscripción no creada'; end if;
end $$;

-- Duplicado de importación (mismo hash) → debe rechazarse
do $$
begin
  insert into public.transactions (holding_id, tipo, fecha, cantidad, importe, hash)
  values ('dddddddd-0000-0000-0000-000000000001', 'compra', '2026-01-15', 26.7, 300, 'h1');
  raise exception 'FALLO: aceptó un duplicado';
exception when unique_violation then null;
end $$;

-- Traspaso sin grupo_id → debe rechazarse
do $$
begin
  insert into public.transactions (holding_id, tipo, fecha, cantidad, importe)
  values ('dddddddd-0000-0000-0000-000000000001', 'traspaso_salida', '2026-07-01', 5, 60);
  raise exception 'FALLO: aceptó traspaso sin grupo';
exception when check_violation then null;
end $$;

-- Ana no puede tocar el catálogo global
do $$
begin
  update public.assets set nombre = 'hackeado' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if (select nombre from public.assets where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'hackeado'
    then raise exception 'FALLO: editó un activo global'; end if;
end $$;

-- ---------- Como Bea ----------
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

do $$
begin
  if (select count(*) from public.portfolios)   <> 0 then raise exception 'FALLO: Bea ve carteras de Ana'; end if;
  if (select count(*) from public.transactions) <> 0 then raise exception 'FALLO: Bea ve operaciones de Ana'; end if;
  if (select count(*) from public.v_positions)  <> 0 then raise exception 'FALLO: Bea ve posiciones de Ana'; end if;
  if (select count(*) from public.assets)       <> 1 then raise exception 'FALLO: Bea no ve el catálogo global'; end if;
end $$;

-- Bea intenta colar una posición en la cartera de Ana → debe rechazarse
insert into public.portfolios (id, nombre) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Colchón');
insert into public.accounts (id, nombre) values ('cccccccc-0000-0000-0000-000000000002', 'Trade Republic');
do $$
begin
  insert into public.holdings (portfolio_id, account_id, asset_id) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002',
     'aaaaaaaa-0000-0000-0000-000000000001');
  raise exception 'FALLO: Bea usó la cartera de Ana';
exception when insufficient_privilege then null;
end $$;

-- Bea intenta borrar las operaciones de Ana → 0 filas afectadas
delete from public.transactions;

-- ---------- Comprobación final como servidor ----------
reset role;
do $$
begin
  if (select count(*) from public.transactions) <> 3 then raise exception 'FALLO: se borraron operaciones de Ana'; end if;
end $$;

-- Anónimo sin sesión no lee nada
set role anon;
do $$
begin
  perform 1 from public.assets;
  raise exception 'FALLO: anónimo puede leer';
exception when insufficient_privilege then null;
end $$;
reset role;

\echo '✔ Todas las pruebas de seguridad e integridad han pasado'
