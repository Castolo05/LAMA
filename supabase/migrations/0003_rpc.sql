-- Lama Conecta — RPCs de negocio (security definer, validan rol y pertenencia)

revoke execute on function public.auth_role(), public.auth_customer_id(), public.auth_driver_id(),
  public.auth_supplier_id(), public.auth_is_owner(), public.has_role(public.app_role[]),
  public.is_seller_of(uuid), public.driver_has_route(uuid), public.driver_has_customer(uuid) from public, anon;

-- Próximo día de entrega: corte 18 h (hora de Buenos Aires), entregas de lunes a sábado
create or replace function public.next_delivery_date(p_now timestamptz) returns date
language plpgsql stable set search_path = '' as $$
declare
  local_ts timestamp := p_now at time zone 'America/Argentina/Buenos_Aires';
  cutoff int := coalesce((select (value)::int from public.settings where key = 'cutoff_hour'), 18);
  d date := local_ts::date;
  steps int := case when extract(hour from local_ts) >= cutoff then 2 else 1 end;
begin
  while steps > 0 loop
    d := d + 1;
    if extract(isodow from d) <> 7 then steps := steps - 1; end if;
  end loop;
  return d;
end $$;

-- Alta de usuarios de Auth (uso interno: seed, admin, titulares)
create or replace function public.create_auth_user(p_email text, p_password text, p_full_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'Ya existe un usuario con ese email';
  end if;
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token)
  values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_full_name), now(), now(),
    '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text, jsonb_build_object('sub', uid::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now());
  return uid;
end $$;
revoke execute on function public.create_auth_user(text, text, text) from public, anon, authenticated;

-- Pedido (portal, preventa o teléfono)
create or replace function public.place_order(p_customer uuid, p_items jsonb, p_channel public.order_channel) returns uuid
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
  elsif v_role = 'preventista' and public.is_seller_of(p_customer) then
    v_channel := 'preventa';
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

create or replace function public.cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare o record; v_role public.app_role := public.auth_role();
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then raise exception 'Pedido inexistente'; end if;
  if v_role = 'cliente' and o.customer_id = public.auth_customer_id() then
    if o.status <> 'recibido' then raise exception 'El pedido ya está en preparación y no se puede anular'; end if;
  elsif v_role in ('ventas', 'admin') then
    if o.status not in ('recibido', 'en_preparacion', 'preparado') then raise exception 'El pedido ya salió a reparto'; end if;
  else
    raise exception 'No autorizado';
  end if;
  update public.orders set status = 'anulado', route_id = null where id = p_order;
end $$;

create or replace function public.start_preparing(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['deposito', 'admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  update public.orders set status = 'en_preparacion' where id = p_order and status = 'recibido';
end $$;

-- Preparación en depósito: descuenta stock, registra faltantes y avisa al cliente
create or replace function public.prepare_order(p_order uuid, p_prepared jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o record; it record; v_prep int; v_missing text := ''; v_ticket uuid;
begin
  if not public.has_role(array['deposito', 'admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
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

-- Confirmación del plan de rutas
create or replace function public.confirm_routes(p_date date, p_plan jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare r jsonb; s jsonb; v_route uuid; n int := 0;
begin
  if not public.has_role(array['logistica', 'admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  for r in select * from jsonb_array_elements(p_plan) loop
    if jsonb_array_length(r->'stops') = 0 then continue; end if;
    insert into public.routes (date, truck_id, driver_id, km_planned, cost)
    values (p_date, (r->>'truck_id')::uuid, (r->>'driver_id')::uuid, (r->>'km')::numeric, (r->>'cost')::numeric)
    returning id into v_route;
    for s in select * from jsonb_array_elements(r->'stops') loop
      update public.orders set route_id = v_route
       where id = (s->>'order_id')::uuid and status = 'preparado' and route_id is null;
      if found then
        insert into public.route_stops (route_id, order_id, seq, eta)
        values (v_route, (s->>'order_id')::uuid, (s->>'seq')::int, (s->>'eta')::timestamptz);
      end if;
    end loop;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.start_route(p_route uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_role(array['logistica', 'admin']::public.app_role[]) or public.driver_has_route(p_route)) then
    raise exception 'No autorizado';
  end if;
  update public.routes set status = 'en_curso', started_at = now() where id = p_route and status = 'planificada';
  update public.orders set status = 'en_reparto'
   where id in (select order_id from public.route_stops where route_id = p_route) and status = 'preparado';
end $$;

-- Entrega en parada: cantidades, envases, OTIF y factura
create or replace function public.deliver_stop(p_stop uuid, p_items jsonb, p_returnables jsonb, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s record; o record; it record; v_del int; v_full boolean := true; v_on_time boolean; v_amount numeric; v_terms int;
  rt jsonb;
begin
  select * into s from public.route_stops where id = p_stop for update;
  if s.id is null then raise exception 'Parada inexistente'; end if;
  if not (public.has_role(array['logistica', 'admin']::public.app_role[]) or public.driver_has_route(s.route_id)) then
    raise exception 'No autorizado';
  end if;
  if s.status <> 'pendiente' then raise exception 'La parada ya fue registrada'; end if;
  select * into o from public.orders where id = s.order_id;

  for it in select * from public.order_items where order_id = o.id loop
    select (e->>'qty_delivered')::int into v_del
      from jsonb_array_elements(coalesce(p_items, '[]')) e where (e->>'item_id')::uuid = it.id;
    v_del := greatest(0, least(coalesce(v_del, it.qty_prepared, it.qty), coalesce(it.qty_prepared, it.qty)));
    update public.order_items set qty_delivered = v_del where id = it.id;
    if v_del < it.qty then v_full := false; end if;
  end loop;

  v_on_time := s.eta is null or now() <= s.eta + interval '30 minutes';

  for rt in select * from jsonb_array_elements(coalesce(p_returnables, '[]')) loop
    if coalesce((rt->>'qty')::int, 0) > 0 then
      insert into public.returnables (route_stop_id, kind, qty) values (p_stop, rt->>'kind', (rt->>'qty')::int);
    end if;
  end loop;

  update public.route_stops
     set status = case when v_full and coalesce(p_note, '') = '' then 'entregada' else 'con_novedad' end::public.stop_status,
         delivered_at = now(), note = nullif(p_note, '')
   where id = p_stop;

  select coalesce(sum(qty_delivered * unit_price), 0) into v_amount from public.order_items where order_id = o.id;
  update public.orders
     set status = case when v_full then 'entregado' else 'con_novedad' end::public.order_status,
         delivered_at = now(), on_time = v_on_time, in_full = v_full, total = v_amount
   where id = o.id;

  select payment_terms_days into v_terms from public.customers where id = o.customer_id;
  if v_amount > 0 then
    insert into public.invoices (customer_id, order_id, number, amount, issued_on, due_on)
    values (o.customer_id, o.id, 'A-0003-' || lpad(o.number::text, 8, '0'), v_amount, current_date, current_date + v_terms);
  end if;
end $$;

create or replace function public.finish_route(p_route uuid, p_km_real numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if not (public.has_role(array['logistica', 'admin']::public.app_role[]) or public.driver_has_route(p_route)) then
    raise exception 'No autorizado';
  end if;
  update public.routes
     set status = 'finalizada', finished_at = now(), km_real = p_km_real,
         cost = round(p_km_real * (select (value)::numeric from public.settings where key = 'cost_per_km')
                + (select (value)::numeric from public.settings where key = 'driver_day_cost'), 2)
   where id = p_route returning * into r;
  update public.trucks set odometer_km = odometer_km + coalesce(p_km_real, 0) where id = r.truck_id;
end $$;

create or replace function public.approve_customer(p_customer uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['ventas', 'admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  update public.customers set status = case when p_approve then 'aprobado' else 'rechazado' end::public.customer_status
   where id = p_customer;
end $$;

-- Autoregistro: el usuario recién creado da de alta su comercio (queda pendiente)
create or replace function public.register_customer(p_name text, p_kind public.customer_kind, p_address text, p_phone text, p_cuit text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; pr record;
begin
  select * into pr from public.profiles where id = auth.uid();
  if pr.id is null or pr.role <> 'cliente' then raise exception 'No autorizado'; end if;
  if pr.customer_id is not null then raise exception 'Tu usuario ya tiene un comercio asociado'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_address), '') = '' then raise exception 'Completá nombre y dirección del comercio'; end if;
  insert into public.customers (name, kind, address, phone, cuit, status, lat, lng, zone)
  values (trim(p_name), p_kind, trim(p_address), p_phone, p_cuit, 'pendiente',
          -37.3217 + (random() - 0.5) * 0.03, -59.1332 + (random() - 0.5) * 0.04, 'barrios')
  returning id into v_customer;
  update public.profiles set customer_id = v_customer, is_owner = true where id = auth.uid();
  return v_customer;
end $$;

-- Titular agrega empleados de su comercio
create or replace function public.owner_add_employee(p_email text, p_full_name text, p_password text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid; v_customer uuid := public.auth_customer_id();
begin
  if not (public.auth_role() = 'cliente' and public.auth_is_owner()) then raise exception 'No autorizado'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres'; end if;
  uid := public.create_auth_user(p_email, p_password, p_full_name);
  update public.profiles set customer_id = v_customer, is_owner = false, full_name = p_full_name where id = uid;
  return uid;
end $$;

revoke execute on function public.place_order(uuid, jsonb, public.order_channel), public.cancel_order(uuid),
  public.start_preparing(uuid), public.prepare_order(uuid, jsonb), public.confirm_routes(date, jsonb),
  public.start_route(uuid), public.deliver_stop(uuid, jsonb, jsonb, text), public.finish_route(uuid, numeric),
  public.approve_customer(uuid, boolean), public.register_customer(text, public.customer_kind, text, text, text),
  public.owner_add_employee(text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, public.order_channel), public.cancel_order(uuid),
  public.start_preparing(uuid), public.prepare_order(uuid, jsonb), public.confirm_routes(date, jsonb),
  public.start_route(uuid), public.deliver_stop(uuid, jsonb, jsonb, text), public.finish_route(uuid, numeric),
  public.approve_customer(uuid, boolean), public.register_customer(text, public.customer_kind, text, text, text),
  public.owner_add_employee(text, text, text) to authenticated;
