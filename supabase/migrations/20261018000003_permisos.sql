-- =============================================================================
-- Kartera · Migración 0003 · Permisos explícitos de la API
-- Supabase puede no exponer automáticamente las tablas nuevas a la API.
-- Estos permisos son de "puerta"; quién ve qué fila lo sigue decidiendo RLS.
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Tablas solo de servidor: el usuario no tiene ni la puerta abierta
revoke all on public.invitations from anon, authenticated;
revoke all on public.waitlist from anon, authenticated;

-- Los anónimos (sin sesión) no ven nada
revoke all on all tables in schema public from anon;
