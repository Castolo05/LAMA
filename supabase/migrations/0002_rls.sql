-- Lama Conecta — helpers de autorización, RLS por rol y auditoría

-- Helpers (security definer: leen profiles sin pasar por RLS y evitan recursión)
create or replace function public.auth_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_customer_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select customer_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_driver_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select driver_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_supplier_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select supplier_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_owner from public.profiles where id = auth.uid() and active), false)
$$;

create or replace function public.has_role(roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = any(roles) from public.profiles where id = auth.uid() and active), false)
$$;

create or replace function public.is_seller_of(p_customer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.customers c where c.id = p_customer and c.seller_id = auth.uid())
$$;

create or replace function public.driver_has_route(p_route uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.routes r join public.profiles p on p.driver_id = r.driver_id
    where r.id = p_route and p.id = auth.uid() and p.role = 'chofer')
$$;

create or replace function public.driver_has_customer(p_customer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o join public.routes r on r.id = o.route_id
    join public.profiles p on p.driver_id = r.driver_id
    where o.customer_id = p_customer and p.id = auth.uid() and p.role = 'chofer')
$$;

-- Alta automática de profile al crear un usuario de Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'cliente')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Activar RLS en todas las tablas
alter table suppliers enable row level security;
alter table trucks enable row level security;
alter table drivers enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table promotions enable row level security;
alter table routes enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table route_stops enable row level security;
alter table returnables enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table telemetry_events enable row level security;
alter table maintenance_alerts enable row level security;
alter table settings enable row level security;
alter table audit_log enable row level security;

-- Catálogo: todos menos chofer y proveedor; edición admin y ventas
create policy catalog_read on categories for select to authenticated
  using (has_role(array['admin','direccion','ventas','preventista','logistica','deposito','cobranzas','cliente']::app_role[]));
create policy catalog_write on categories for all to authenticated
  using (has_role(array['admin','ventas']::app_role[])) with check (has_role(array['admin','ventas']::app_role[]));

create policy products_read on products for select to authenticated
  using (has_role(array['admin','direccion','ventas','preventista','logistica','deposito','cobranzas','cliente']::app_role[]));
create policy products_write on products for all to authenticated
  using (has_role(array['admin','ventas']::app_role[])) with check (has_role(array['admin','ventas']::app_role[]));

create policy promotions_read on promotions for select to authenticated
  using (has_role(array['admin','direccion','ventas','preventista','logistica','deposito','cobranzas','cliente']::app_role[]));
create policy promotions_write on promotions for all to authenticated
  using (has_role(array['admin','ventas']::app_role[])) with check (has_role(array['admin','ventas']::app_role[]));

create policy suppliers_read on suppliers for select to authenticated
  using (has_role(array['admin','direccion','ventas','preventista','logistica','deposito','cobranzas','cliente']::app_role[])
         or id = auth_supplier_id());
create policy suppliers_write on suppliers for all to authenticated
  using (has_role(array['admin']::app_role[])) with check (has_role(array['admin']::app_role[]));

-- Comercios
create policy customers_read on customers for select to authenticated
  using (has_role(array['admin','direccion','ventas','logistica','deposito','cobranzas']::app_role[])
         or (has_role(array['preventista']::app_role[]) and seller_id = auth.uid())
         or (has_role(array['cliente']::app_role[]) and id = auth_customer_id())
         or driver_has_customer(id));
create policy customers_write on customers for update to authenticated
  using (has_role(array['admin','ventas']::app_role[])) with check (has_role(array['admin','ventas']::app_role[]));

-- Perfiles: propio; admin/dirección/ventas todos; titular ve los de su comercio
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid()
         or has_role(array['admin','direccion','ventas','logistica','cobranzas']::app_role[])
         or (auth_is_owner() and customer_id = auth_customer_id()));
create policy profiles_admin on profiles for update to authenticated
  using (has_role(array['admin']::app_role[])) with check (has_role(array['admin']::app_role[]));

-- Pedidos (las altas y cambios de estado van por RPC)
create policy orders_read on orders for select to authenticated
  using (has_role(array['admin','direccion','ventas','logistica','deposito','cobranzas']::app_role[])
         or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id())
         or (has_role(array['preventista']::app_role[]) and is_seller_of(customer_id))
         or (route_id is not null and driver_has_route(route_id)));
create policy orders_admin on orders for update to authenticated
  using (has_role(array['admin']::app_role[])) with check (has_role(array['admin']::app_role[]));

create policy order_items_read on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_id));

-- Rutas
create policy routes_read on routes for select to authenticated
  using (has_role(array['admin','direccion','ventas','logistica','deposito']::app_role[])
         or driver_id = auth_driver_id());
create policy routes_write on routes for all to authenticated
  using (has_role(array['admin','logistica']::app_role[])) with check (has_role(array['admin','logistica']::app_role[]));

create policy stops_read on route_stops for select to authenticated
  using (exists (select 1 from routes r where r.id = route_id));
create policy stops_write on route_stops for all to authenticated
  using (has_role(array['admin','logistica']::app_role[])) with check (has_role(array['admin','logistica']::app_role[]));

create policy returnables_read on returnables for select to authenticated
  using (exists (select 1 from route_stops s where s.id = route_stop_id));

-- Reclamos y contacto
create policy tickets_read on tickets for select to authenticated
  using (has_role(array['admin','direccion','ventas','logistica']::app_role[])
         or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id()));
create policy tickets_insert on tickets for insert to authenticated
  with check (has_role(array['admin','ventas']::app_role[])
              or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id()));
create policy tickets_update on tickets for update to authenticated
  using (has_role(array['admin','ventas']::app_role[])
         or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id()))
  with check (has_role(array['admin','ventas']::app_role[])
              or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id()));

create policy ticket_messages_read on ticket_messages for select to authenticated
  using (exists (select 1 from tickets t where t.id = ticket_id));
create policy ticket_messages_insert on ticket_messages for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from tickets t where t.id = ticket_id));

-- Estado de cuenta
create policy invoices_read on invoices for select to authenticated
  using (has_role(array['admin','direccion','ventas','cobranzas']::app_role[])
         or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id()));
create policy invoices_write on invoices for all to authenticated
  using (has_role(array['admin','cobranzas']::app_role[])) with check (has_role(array['admin','cobranzas']::app_role[]));

create policy payments_read on payments for select to authenticated
  using (has_role(array['admin','direccion','ventas','cobranzas']::app_role[])
         or (has_role(array['cliente']::app_role[]) and customer_id = auth_customer_id()));
create policy payments_write on payments for all to authenticated
  using (has_role(array['admin','cobranzas']::app_role[])) with check (has_role(array['admin','cobranzas']::app_role[]));

-- Flota
create policy trucks_read on trucks for select to authenticated
  using (has_role(array['admin','direccion','logistica','deposito']::app_role[])
         or id = (select d.truck_id from drivers d where d.id = auth_driver_id()));
create policy trucks_write on trucks for all to authenticated
  using (has_role(array['admin','logistica']::app_role[])) with check (has_role(array['admin','logistica']::app_role[]));

create policy drivers_read on drivers for select to authenticated
  using (has_role(array['admin','direccion','logistica','deposito']::app_role[]) or id = auth_driver_id());
create policy drivers_write on drivers for all to authenticated
  using (has_role(array['admin','logistica']::app_role[])) with check (has_role(array['admin','logistica']::app_role[]));

create policy telemetry_read on telemetry_events for select to authenticated
  using (has_role(array['admin','direccion','logistica']::app_role[]));

create policy maintenance_read on maintenance_alerts for select to authenticated
  using (has_role(array['admin','direccion','logistica']::app_role[]));
create policy maintenance_write on maintenance_alerts for update to authenticated
  using (has_role(array['admin','logistica']::app_role[])) with check (has_role(array['admin','logistica']::app_role[]));

-- Parámetros y auditoría
create policy settings_read on settings for select to authenticated using (true);
create policy settings_write on settings for all to authenticated
  using (has_role(array['admin']::app_role[])) with check (has_role(array['admin']::app_role[]));

create policy audit_read on audit_log for select to authenticated
  using (has_role(array['admin','direccion']::app_role[]));

-- Auditoría por triggers
create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare act text; det jsonb;
begin
  if tg_table_name = 'products' then
    if new.price is distinct from old.price then
      act := 'cambio_precio'; det := jsonb_build_object('producto', new.name, 'antes', old.price, 'despues', new.price);
    elsif new.active is distinct from old.active then
      act := case when new.active then 'producto_activado' else 'producto_desactivado' end; det := jsonb_build_object('producto', new.name);
    end if;
  elsif tg_table_name = 'profiles' then
    if tg_op = 'INSERT' then
      act := 'alta_usuario'; det := jsonb_build_object('email', new.email, 'rol', new.role);
    elsif new.role is distinct from old.role then
      act := 'cambio_rol'; det := jsonb_build_object('email', new.email, 'antes', old.role, 'despues', new.role);
    elsif new.active is distinct from old.active then
      act := case when new.active then 'usuario_activado' else 'baja_usuario' end; det := jsonb_build_object('email', new.email);
    end if;
  elsif tg_table_name = 'customers' then
    if new.status is distinct from old.status then
      act := 'cliente_' || new.status::text; det := jsonb_build_object('comercio', new.name);
    end if;
  elsif tg_table_name = 'orders' then
    if new.status = 'anulado' and old.status is distinct from 'anulado' then
      act := 'anulacion_pedido'; det := jsonb_build_object('pedido', new.number);
    end if;
  end if;
  if act is not null then
    insert into public.audit_log (actor_id, action, entity, entity_id, detail)
    values (auth.uid(), act, tg_table_name, new.id::text, det);
  end if;
  return new;
end $$;

create trigger audit_products after update on products for each row execute function public.audit();
create trigger audit_profiles after insert or update on profiles for each row execute function public.audit();
create trigger audit_customers after update on customers for each row execute function public.audit();
create trigger audit_orders after update on orders for each row execute function public.audit();

-- Los helpers no deben ser invocables por anon
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit() from public, anon, authenticated;
