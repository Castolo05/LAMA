-- Test de RPCs de negocio: transacción con rollback. Éxito = excepción 'RPC OK'.
begin;

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rpc-a@t.local'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rpc-p@t.local'),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rpc-ch@t.local');
insert into customers (id, name, address, status) values
  ('00000000-0000-0000-0000-00000000aaaa', 'RPC A', 'x', 'aprobado'),
  ('00000000-0000-0000-0000-00000000eeee', 'RPC Pendiente', 'y', 'pendiente');
insert into categories (id, name, line) values ('00000000-0000-0000-0000-0000000000c0', 'Gaseosas', 'coca_cola');
insert into products (id, sku, name, brand, category_id, price, cost, stock) values
  ('00000000-0000-0000-0000-0000000000f1', 'T-1', 'Producto test', 'Test', '00000000-0000-0000-0000-0000000000c0', 1000, 600, 5);
insert into trucks (id, plate, name, capacity_kg, capacity_m3) values ('00000000-0000-0000-0000-0000000000b0', 'TST000', 'Camión test', 5000, 30);
insert into drivers (id, full_name, truck_id) values ('00000000-0000-0000-0000-00000000dddd', 'Chofer test', '00000000-0000-0000-0000-0000000000b0');
update profiles set role = 'cliente', customer_id = '00000000-0000-0000-0000-00000000aaaa' where id = '00000000-0000-0000-0000-0000000000a1';
update profiles set role = 'cliente', customer_id = '00000000-0000-0000-0000-00000000eeee' where id = '00000000-0000-0000-0000-0000000000e1';
update profiles set role = 'chofer', driver_id = '00000000-0000-0000-0000-00000000dddd' where id = '00000000-0000-0000-0000-0000000000d1';

set local role authenticated;

do $$
declare
  v_order uuid; v_route uuid; v_stop uuid; v_item uuid; r record;
  item jsonb := '[{"product_id":"00000000-0000-0000-0000-0000000000f1","qty":2}]';
begin
  -- fechas de entrega (corte 18 h, lunes a sábado)
  if next_delivery_date('2026-10-27 19:00-03') <> '2026-10-29' then raise exception 'FAIL: martes 19 h debería entregar jueves'; end if;
  if next_delivery_date('2026-10-27 17:59-03') <> '2026-10-28' then raise exception 'FAIL: martes 17:59 debería entregar miércoles'; end if;
  if next_delivery_date('2026-10-31 10:00-03') <> '2026-11-02' then raise exception 'FAIL: sábado 10 h debería entregar lunes'; end if;
  if next_delivery_date('2026-10-31 19:00-03') <> '2026-11-03' then raise exception 'FAIL: sábado 19 h debería entregar martes'; end if;

  -- comercio pendiente
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
  begin
    perform place_order('00000000-0000-0000-0000-00000000eeee', item, 'portal');
    raise exception 'FAIL: pendiente pudo pedir';
  exception when others then
    if sqlerrm <> 'Comercio pendiente de aprobación' then raise exception 'FAIL pendiente: %', sqlerrm; end if;
  end;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  begin
    perform place_order('00000000-0000-0000-0000-00000000aaaa', '[]', 'portal');
    raise exception 'FAIL: pedido vacío aceptado';
  exception when others then
    if sqlerrm <> 'El pedido está vacío' then raise exception 'FAIL vacío: %', sqlerrm; end if;
  end;
  begin
    perform place_order('00000000-0000-0000-0000-00000000aaaa', '[{"product_id":"00000000-0000-0000-0000-0000000000f1","qty":9}]', 'portal');
    raise exception 'FAIL: stock insuficiente aceptado';
  exception when others then
    if sqlerrm not like 'Stock insuficiente%' then raise exception 'FAIL stock: %', sqlerrm; end if;
  end;
  begin
    perform place_order('00000000-0000-0000-0000-00000000eeee', item, 'portal');
    raise exception 'FAIL: cliente pidió para otro comercio';
  exception when others then
    if sqlerrm <> 'No autorizado' then raise exception 'FAIL ajeno: %', sqlerrm; end if;
  end;

  v_order := place_order('00000000-0000-0000-0000-00000000aaaa', item, 'portal');
  select * into r from orders where id = v_order;
  if r.total <> 2000 or r.status <> 'recibido' or r.channel <> 'portal' then raise exception 'FAIL: pedido mal creado %', row_to_json(r); end if;
  if r.delivery_date <> next_delivery_date(now()) then raise exception 'FAIL: fecha de entrega'; end if;

  -- preparar / rutear como superusuario de test
  reset role;
  select id into v_item from order_items where order_id = v_order;
  update order_items set qty_prepared = qty where id = v_item;
  update orders set status = 'preparado' where id = v_order;
  insert into routes (date, truck_id, driver_id, status) values (current_date, '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-00000000dddd', 'en_curso') returning id into v_route;
  insert into route_stops (route_id, order_id, seq, eta) values (v_route, v_order, 1, now() + interval '1 hour') returning id into v_stop;
  update orders set route_id = v_route, status = 'en_reparto' where id = v_order;
  set local role authenticated;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
  perform deliver_stop(v_stop, jsonb_build_array(jsonb_build_object('item_id', v_item, 'qty_delivered', 2)), '[{"kind":"cajones","qty":3}]', null);
  reset role;
  select * into r from orders where id = v_order;
  if r.status <> 'entregado' or not r.on_time or not r.in_full then raise exception 'FAIL: entrega %', row_to_json(r); end if;
  if not exists (select 1 from invoices where order_id = v_order and amount = 2000) then raise exception 'FAIL: no se facturó'; end if;
  if not exists (select 1 from returnables where route_stop_id = v_stop and qty = 3) then raise exception 'FAIL: envases'; end if;

  raise exception 'RPC OK';
end $$;

rollback;
