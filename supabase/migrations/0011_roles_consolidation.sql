-- Consolidación de roles: se elimina la figura del preventista (rol, cartera y canal "preventa"),
-- Depósito se fusiona en Logística y Cobranzas en Ventas y atención.
-- También se da de baja la cuenta demo cliente2.

-- 1. Datos
alter table public.profiles disable trigger audit_profiles;
update public.profiles set role = 'logistica' where role = 'deposito';
update public.profiles set role = 'ventas' where role = 'cobranzas';
alter table public.profiles enable trigger audit_profiles;

update public.orders set channel = 'telefono' where channel = 'preventa';
update public.customers set seller_id = null;

with gone as (
  select id from public.profiles where role = 'preventista' or email = 'cliente2@demo.lama.com.ar'
)
update public.orders set created_by = null where created_by in (select id from gone);
with gone as (
  select id from public.profiles where role = 'preventista' or email = 'cliente2@demo.lama.com.ar'
)
update public.ticket_messages set author_id = null where author_id in (select id from gone);
delete from auth.users where id in (
  select id from public.profiles where role = 'preventista' or email = 'cliente2@demo.lama.com.ar');

-- historial de muestra: mismos eventos que supabase/seed/04_audit.sql
update public.audit_log set detail = '{"email":"ventas2@demo.lama.com.ar","rol":"ventas"}'
 where detail->>'email' = 'preventista3@demo.lama.com.ar';
update public.audit_log set detail = '{"email":"logistica2@demo.lama.com.ar","antes":"ventas","despues":"logistica"}'
 where detail->>'email' = 'preventista2@demo.lama.com.ar';
delete from public.audit_log
 where detail->>'rol' in ('preventista', 'deposito', 'cobranzas')
    or detail->>'antes' in ('preventista', 'deposito', 'cobranzas')
    or detail->>'despues' in ('preventista', 'deposito', 'cobranzas');

-- 2. Se quitan las políticas y funciones atadas a los tipos que cambian
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

drop function public.has_role(public.app_role[]);
drop function public.auth_role();
drop function public.is_seller_of(uuid);
drop function public.admin_create_user(text, text, public.app_role, text);
drop function public.admin_update_user(uuid, public.app_role, boolean);
drop function public.place_order(uuid, jsonb, public.order_channel);
drop function public.kpi_monthly(date, date);
drop function public.seller_performance(date, date);
drop function public.customer_balances();

alter table public.customers drop column seller_id;

-- 3. Tipos nuevos
alter type public.app_role rename to app_role_old;
create type public.app_role as enum ('admin','direccion','ventas','logistica','chofer','cliente','proveedor');
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
alter table public.profiles alter column role set default 'cliente';
drop type public.app_role_old;

alter type public.order_channel rename to order_channel_old;
create type public.order_channel as enum ('portal','telefono');
alter table public.orders alter column channel type public.order_channel using channel::text::public.order_channel;
drop type public.order_channel_old;

-- 4. Helpers de autorización
create function public.auth_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.has_role(roles public.app_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = any(roles) from public.profiles where id = auth.uid() and active), false)
$$;

revoke execute on function public.auth_role(), public.has_role(public.app_role[]) from public, anon;
grant execute on function public.auth_role(), public.has_role(public.app_role[]) to authenticated;

-- 5. Políticas RLS (matriz de permisos con los roles consolidados)
create policy catalog_read on public.categories for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica','cliente']::public.app_role[]));
create policy catalog_write on public.categories for all to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])) with check (public.has_role(array['admin','ventas']::public.app_role[]));

create policy products_read on public.products for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica','cliente']::public.app_role[]));
create policy products_write on public.products for all to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])) with check (public.has_role(array['admin','ventas']::public.app_role[]));

create policy promotions_read on public.promotions for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica','cliente']::public.app_role[]));
create policy promotions_write on public.promotions for all to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])) with check (public.has_role(array['admin','ventas']::public.app_role[]));

create policy suppliers_read on public.suppliers for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica','cliente']::public.app_role[])
         or id = public.auth_supplier_id());
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));

create policy customers_read on public.customers for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
         or (public.has_role(array['cliente']::public.app_role[]) and id = public.auth_customer_id())
         or public.driver_has_customer(id));
create policy customers_write on public.customers for update to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])) with check (public.has_role(array['admin','ventas']::public.app_role[]));

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid()
         or public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
         or (public.auth_is_owner() and customer_id = public.auth_customer_id()));
create policy profiles_admin on public.profiles for update to authenticated
  using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));

create policy orders_read on public.orders for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
         or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id())
         or (route_id is not null and public.driver_has_route(route_id)));
create policy orders_admin on public.orders for update to authenticated
  using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));

create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

create policy routes_read on public.routes for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
         or driver_id = public.auth_driver_id());
create policy routes_write on public.routes for all to authenticated
  using (public.has_role(array['admin','logistica']::public.app_role[])) with check (public.has_role(array['admin','logistica']::public.app_role[]));

create policy stops_read on public.route_stops for select to authenticated
  using (exists (select 1 from public.routes r where r.id = route_id));
create policy stops_write on public.route_stops for all to authenticated
  using (public.has_role(array['admin','logistica']::public.app_role[])) with check (public.has_role(array['admin','logistica']::public.app_role[]));

create policy returnables_read on public.returnables for select to authenticated
  using (exists (select 1 from public.route_stops s where s.id = route_stop_id));

create policy tickets_read on public.tickets for select to authenticated
  using (public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
         or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id()));
create policy tickets_insert on public.tickets for insert to authenticated
  with check (public.has_role(array['admin','ventas']::public.app_role[])
              or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id()));
create policy tickets_update on public.tickets for update to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])
         or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id()))
  with check (public.has_role(array['admin','ventas']::public.app_role[])
              or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id()));

create policy ticket_messages_read on public.ticket_messages for select to authenticated
  using (exists (select 1 from public.tickets t where t.id = ticket_id));
create policy ticket_messages_insert on public.ticket_messages for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.tickets t where t.id = ticket_id));

create policy invoices_read on public.invoices for select to authenticated
  using (public.has_role(array['admin','direccion','ventas']::public.app_role[])
         or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id()));
create policy invoices_write on public.invoices for all to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])) with check (public.has_role(array['admin','ventas']::public.app_role[]));

create policy payments_read on public.payments for select to authenticated
  using (public.has_role(array['admin','direccion','ventas']::public.app_role[])
         or (public.has_role(array['cliente']::public.app_role[]) and customer_id = public.auth_customer_id()));
create policy payments_write on public.payments for all to authenticated
  using (public.has_role(array['admin','ventas']::public.app_role[])) with check (public.has_role(array['admin','ventas']::public.app_role[]));

create policy trucks_read on public.trucks for select to authenticated
  using (public.has_role(array['admin','direccion','logistica']::public.app_role[])
         or id = (select d.truck_id from public.drivers d where d.id = public.auth_driver_id()));
create policy trucks_write on public.trucks for all to authenticated
  using (public.has_role(array['admin','logistica']::public.app_role[])) with check (public.has_role(array['admin','logistica']::public.app_role[]));

create policy drivers_read on public.drivers for select to authenticated
  using (public.has_role(array['admin','direccion','logistica']::public.app_role[]) or id = public.auth_driver_id());
create policy drivers_write on public.drivers for all to authenticated
  using (public.has_role(array['admin','logistica']::public.app_role[])) with check (public.has_role(array['admin','logistica']::public.app_role[]));

create policy telemetry_read on public.telemetry_events for select to authenticated
  using (public.has_role(array['admin','direccion','logistica']::public.app_role[]));

create policy maintenance_read on public.maintenance_alerts for select to authenticated
  using (public.has_role(array['admin','direccion','logistica']::public.app_role[]));
create policy maintenance_write on public.maintenance_alerts for update to authenticated
  using (public.has_role(array['admin','logistica']::public.app_role[])) with check (public.has_role(array['admin','logistica']::public.app_role[]));

create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_write on public.settings for all to authenticated
  using (public.has_role(array['admin']::public.app_role[])) with check (public.has_role(array['admin']::public.app_role[]));

create policy audit_read on public.audit_log for select to authenticated
  using (public.has_role(array['admin','direccion']::public.app_role[]));

-- 6. RPCs con reglas de rol actualizadas
create function public.place_order(p_customer uuid, p_items jsonb, p_channel public.order_channel) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_role public.app_role := public.auth_role();
  v_channel public.order_channel;
  v_status public.customer_status;
  v_order uuid;
  v_total numeric := 0;
  it jsonb;
  p record;
  v_qty int;
  v_price numeric;
begin
  if v_role = 'cliente' and p_customer = public.auth_customer_id() then
    v_channel := 'portal';
  elsif v_role in ('ventas', 'admin') then
    v_channel := coalesce(p_channel, 'telefono');
  else
    raise exception 'No autorizado';
  end if;

  select status into v_status from public.customers where id = p_customer;
  if v_status is null then raise exception 'Comercio inexistente'; end if;
  if v_status <> 'aprobado' then raise exception 'Comercio pendiente de aprobación'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'El pedido está vacío'; end if;

  insert into public.orders (customer_id, created_by, channel, delivery_date)
  values (p_customer, auth.uid(), v_channel, public.next_delivery_date(now()))
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it->>'qty')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad inválida'; end if;
    select * into p from public.products where id = (it->>'product_id')::uuid and active;
    if p.id is null then raise exception 'Producto no disponible'; end if;
    if v_qty > p.stock then raise exception 'Stock insuficiente: %', p.name; end if;
    select round(p.price * (1 - coalesce(max(pr.pct), 0) / 100), 2) into v_price
      from public.promotions pr where pr.product_id = p.id and current_date between pr.starts_on and pr.ends_on;
    insert into public.order_items (order_id, product_id, qty, unit_price, unit_cost)
    values (v_order, p.id, v_qty, v_price, p.cost);
    v_total := v_total + v_price * v_qty;
  end loop;

  update public.orders set total = v_total where id = v_order;
  return v_order;
end $$;

create or replace function public.start_preparing(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['logistica', 'admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  update public.orders set status = 'en_preparacion' where id = p_order and status = 'recibido';
end $$;

create or replace function public.prepare_order(p_order uuid, p_prepared jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o record; it record; v_prep int; v_missing text := ''; v_ticket uuid;
begin
  if not public.has_role(array['logistica', 'admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  select * into o from public.orders where id = p_order for update;
  if o.status not in ('recibido', 'en_preparacion') then raise exception 'El pedido no está pendiente de preparación'; end if;

  for it in select oi.*, p.name, p.stock from public.order_items oi join public.products p on p.id = oi.product_id where oi.order_id = p_order loop
    select coalesce((e->>'qty_prepared')::int, it.qty) into v_prep
      from jsonb_array_elements(coalesce(p_prepared, '[]')) e where (e->>'item_id')::uuid = it.id;
    v_prep := greatest(0, least(coalesce(v_prep, it.qty), it.qty, it.stock));
    update public.order_items set qty_prepared = v_prep where id = it.id;
    update public.products set stock = stock - v_prep where id = it.product_id;
    if v_prep < it.qty then
      v_missing := v_missing || format('%s: faltan %s. ', it.name, it.qty - v_prep);
    end if;
  end loop;

  update public.orders
     set status = 'preparado',
         total = (select coalesce(sum(qty_prepared * unit_price), 0) from public.order_items where order_id = p_order)
   where id = p_order;

  if v_missing <> '' then
    insert into public.tickets (customer_id, order_id, kind, status, subject)
    values (o.customer_id, p_order, 'faltante', 'respondido', format('Faltante en pedido #%s', o.number))
    returning id into v_ticket;
    insert into public.ticket_messages (ticket_id, author_id, body)
    values (v_ticket, auth.uid(), 'Te avisamos que al preparar tu pedido hubo faltantes. ' || v_missing || 'El importe se ajustó automáticamente.');
  end if;
end $$;

create or replace function public.order_tracking(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o record; res jsonb;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then return null; end if;
  if not (public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
          or (public.auth_role() = 'cliente' and o.customer_id = public.auth_customer_id())) then
    raise exception 'No autorizado';
  end if;
  if o.route_id is null then return null; end if;
  select jsonb_build_object(
    'route_status', r.status,
    'truck', t.name,
    'driver', split_part(d.full_name, ' ', 1),
    'started_at', r.started_at,
    'stops', (select jsonb_agg(jsonb_build_object(
                'seq', s.seq, 'lat', c.lat, 'lng', c.lng, 'done', s.status <> 'pendiente',
                'mine', s.order_id = p_order, 'eta', s.eta, 'delivered_at', s.delivered_at) order by s.seq)
              from public.route_stops s join public.orders o2 on o2.id = s.order_id join public.customers c on c.id = o2.customer_id
              where s.route_id = r.id))
  into res
  from public.routes r join public.trucks t on t.id = r.truck_id join public.drivers d on d.id = r.driver_id
  where r.id = o.route_id;
  return res;
end $$;

create function public.customer_balances() returns table (
  customer_id uuid, name text, payment_terms_days int, invoiced numeric, paid numeric,
  corriente numeric, d1_30 numeric, d31_60 numeric, d60_mas numeric, total numeric, last_payment date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin','direccion','ventas']::public.app_role[]) then raise exception 'No autorizado'; end if;
  return query
  with pay as (select p.customer_id, sum(p.amount) amt, max(p.paid_on) last_paid from public.payments p group by 1),
  inv as (
    select i.customer_id, i.amount, i.due_on,
           sum(i.amount) over (partition by i.customer_id order by i.issued_on, i.number) as cum
    from public.invoices i
  ),
  open as (
    select inv.customer_id, inv.due_on,
           greatest(0, least(inv.amount, inv.cum - coalesce(pay.amt, 0))) as open_amt
    from inv left join pay using (customer_id)
  )
  select c.id, c.name, c.payment_terms_days,
         coalesce((select sum(amount) from public.invoices where invoices.customer_id = c.id), 0),
         coalesce(pay.amt, 0),
         coalesce(sum(o.open_amt) filter (where o.due_on >= current_date), 0),
         coalesce(sum(o.open_amt) filter (where current_date - o.due_on between 1 and 30), 0),
         coalesce(sum(o.open_amt) filter (where current_date - o.due_on between 31 and 60), 0),
         coalesce(sum(o.open_amt) filter (where current_date - o.due_on > 60), 0),
         coalesce(sum(o.open_amt), 0),
         pay.last_paid
  from public.customers c
  left join open o on o.customer_id = c.id
  left join pay on pay.customer_id = c.id
  where c.status = 'aprobado'
  group by c.id, c.name, c.payment_terms_days, pay.amt, pay.last_paid;
end $$;

create function public.kpi_monthly(p_from date, p_to date) returns table (
  month date, orders bigint, delivered bigint, otif numeric, bultos bigint, revenue numeric, route_cost numeric,
  cost_per_bulto numeric, km numeric, portal_share numeric, telefono_share numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[]) then raise exception 'No autorizado'; end if;
  return query
  with o as (
    select date_trunc('month', delivery_date)::date m, count(*) n,
           count(*) filter (where status in ('entregado','con_novedad')) d,
           avg(case when on_time and in_full then 1.0 else 0 end) filter (where status in ('entregado','con_novedad')) otif,
           avg(case when channel = 'portal' then 1.0 else 0 end) ps,
           avg(case when channel = 'telefono' then 1.0 else 0 end) tl
    from public.orders where delivery_date between p_from and p_to and status <> 'anulado' group by 1),
  b as (
    select date_trunc('month', o.delivery_date)::date m, sum(oi.qty_delivered) bul, sum(oi.qty_delivered * oi.unit_price) rev
    from public.orders o join public.order_items oi on oi.order_id = o.id
    where o.delivery_date between p_from and p_to and o.status in ('entregado','con_novedad') group by 1),
  r as (
    select date_trunc('month', date)::date m, sum(cost) c, sum(coalesce(km_real, km_planned)) k
    from public.routes where date between p_from and p_to and status = 'finalizada' group by 1)
  select o.m, o.n, o.d, round(coalesce(o.otif, 0), 4), coalesce(b.bul, 0)::bigint, round(coalesce(b.rev, 0), 2), round(coalesce(r.c, 0), 2),
         round(case when coalesce(b.bul, 0) > 0 then coalesce(r.c, 0) / b.bul else 0 end, 2), round(coalesce(r.k, 0), 1),
         round(o.ps, 4), round(o.tl, 4)
  from o left join b using (m) left join r using (m) order by o.m;
end $$;

create function public.admin_create_user(p_email text, p_full_name text, p_role public.app_role, p_password text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.has_role(array['admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  if p_role in ('cliente', 'chofer', 'proveedor') then raise exception 'Los clientes se registran desde el portal; choferes y proveedores se vinculan desde la base'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres'; end if;
  uid := public.create_auth_user(p_email, p_password, p_full_name);
  update public.profiles set role = p_role, full_name = p_full_name where id = uid;
  return uid;
end $$;

create function public.admin_update_user(p_user uuid, p_role public.app_role, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  if p_user = auth.uid() and (p_role <> 'admin' or not p_active) then raise exception 'No podés quitarte tu propio acceso de administrador'; end if;
  update public.profiles set role = p_role, active = p_active where id = p_user;
end $$;

revoke execute on function public.place_order(uuid, jsonb, public.order_channel), public.customer_balances(),
  public.kpi_monthly(date, date), public.admin_create_user(text, text, public.app_role, text),
  public.admin_update_user(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.place_order(uuid, jsonb, public.order_channel), public.customer_balances(),
  public.kpi_monthly(date, date), public.admin_create_user(text, text, public.app_role, text),
  public.admin_update_user(uuid, public.app_role, boolean) to authenticated;
