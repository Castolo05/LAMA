-- Test de RLS: se ejecuta en una transacción y termina en rollback.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-a@t.local'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-b@t.local'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-p@t.local'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-ch@t.local');

insert into customers (id, name, address, status) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Test A', 'x', 'aprobado'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Test B', 'y', 'aprobado');
insert into suppliers (id, name) values ('00000000-0000-0000-0000-00000000cccc', 'Prov test');
insert into drivers (id, full_name) values ('00000000-0000-0000-0000-00000000dddd', 'Chofer test');

-- profiles puede crearse por trigger de alta; upsert para fijar rol y vínculos
insert into profiles (id, role, customer_id, supplier_id, driver_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'cliente', '00000000-0000-0000-0000-00000000aaaa', null, null),
  ('00000000-0000-0000-0000-0000000000b1', 'cliente', '00000000-0000-0000-0000-00000000bbbb', null, null),
  ('00000000-0000-0000-0000-0000000000c1', 'proveedor', null, '00000000-0000-0000-0000-00000000cccc', null),
  ('00000000-0000-0000-0000-0000000000d1', 'chofer', null, null, '00000000-0000-0000-0000-00000000dddd')
on conflict (id) do update set role = excluded.role, customer_id = excluded.customer_id,
  supplier_id = excluded.supplier_id, driver_id = excluded.driver_id;

insert into orders (customer_id, channel, delivery_date) values ('00000000-0000-0000-0000-00000000bbbb', 'portal', current_date);
insert into invoices (customer_id, number, amount, issued_on, due_on) values ('00000000-0000-0000-0000-00000000bbbb', 'T-1', 100, current_date, current_date);
insert into tickets (customer_id, kind, subject) values ('00000000-0000-0000-0000-00000000bbbb', 'consulta', 'x');

set local role authenticated;

do $$
declare n int;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  select count(*) into n from orders where customer_id = '00000000-0000-0000-0000-00000000bbbb';
  if n > 0 then raise exception 'FAIL: cliente A ve pedidos de B'; end if;
  select count(*) into n from invoices where customer_id = '00000000-0000-0000-0000-00000000bbbb';
  if n > 0 then raise exception 'FAIL: cliente A ve facturas de B'; end if;
  select count(*) into n from tickets where customer_id = '00000000-0000-0000-0000-00000000bbbb';
  if n > 0 then raise exception 'FAIL: cliente A ve reclamos de B'; end if;
  select count(*) into n from customers where id = '00000000-0000-0000-0000-00000000bbbb';
  if n > 0 then raise exception 'FAIL: cliente A ve el comercio B'; end if;
  update customers set status = 'aprobado', name = 'hack' where id = '00000000-0000-0000-0000-00000000aaaa';
  select count(*) into n from customers where name = 'hack';
  if n > 0 then raise exception 'FAIL: cliente A edita su comercio'; end if;
  update profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
  if auth_role() = 'admin' then raise exception 'FAIL: cliente se autoasigna admin'; end if;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  select count(*) into n from orders;
  if n <> 1 then raise exception 'FAIL: cliente B debería ver su pedido (ve %)', n; end if;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  select count(*) into n from orders;
  if n > 0 then raise exception 'FAIL: proveedor ve pedidos'; end if;
  select count(*) into n from customers;
  if n > 0 then raise exception 'FAIL: proveedor ve comercios'; end if;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
  select count(*) into n from invoices;
  if n > 0 then raise exception 'FAIL: chofer ve facturas'; end if;
  select count(*) into n from orders;
  if n > 0 then raise exception 'FAIL: chofer ve pedidos fuera de su ruta'; end if;
  raise exception 'RLS OK'; -- éxito: se informa como excepción para que se vea vía MCP
end $$;

rollback;
