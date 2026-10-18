-- Crea tu primera invitación (para ti). Ejecútalo en el SQL Editor de Supabase
-- y abre: https://TU-DOMINIO/registro?invitacion=<codigo que devuelve>
insert into public.invitations (codigo, email, expira_en)
values (encode(gen_random_bytes(12), 'hex'), null, now() + interval '30 days')
returning codigo;
