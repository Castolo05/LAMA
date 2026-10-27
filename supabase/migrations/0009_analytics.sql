-- Capa de análisis (Pilar 2): indicadores calculados sobre los datos transaccionales, con control de rol.
create or replace function public.kpi_monthly(p_from date, p_to date) returns table (
  month date, orders bigint, delivered bigint, otif numeric, bultos bigint, revenue numeric, route_cost numeric,
  cost_per_bulto numeric, km numeric, portal_share numeric, preventa_share numeric, telefono_share numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin','direccion','ventas','logistica','cobranzas']::public.app_role[]) then raise exception 'No autorizado'; end if;
  return query
  with o as (
    select date_trunc('month', delivery_date)::date m, count(*) n,
           count(*) filter (where status in ('entregado','con_novedad')) d,
           avg(case when on_time and in_full then 1.0 else 0 end) filter (where status in ('entregado','con_novedad')) otif,
           avg(case when channel = 'portal' then 1.0 else 0 end) ps,
           avg(case when channel = 'preventa' then 1.0 else 0 end) pv,
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
         round(o.ps, 4), round(o.pv, 4), round(o.tl, 4)
  from o left join b using (m) left join r using (m) order by o.m;
end $$;

create or replace function public.customer_profitability(p_from date, p_to date) returns table (
  customer_id uuid, name text, zone text, orders bigint, bultos bigint, revenue numeric, margin numeric, logistic_cost numeric, profit numeric)
language plpgsql stable security definer set search_path = '' as $$
declare cpb numeric;
begin
  if not public.has_role(array['admin','direccion','ventas']::public.app_role[]) then raise exception 'No autorizado'; end if;
  select coalesce(sum(r.cost), 0) / nullif((select sum(oi.qty_delivered) from public.orders o join public.order_items oi on oi.order_id = o.id
          where o.delivery_date between p_from and p_to and o.status in ('entregado','con_novedad')), 0)
    into cpb from public.routes r where r.date between p_from and p_to and r.status = 'finalizada';
  return query
  select c.id, c.name, c.zone, count(distinct o.id), sum(oi.qty_delivered)::bigint,
         round(sum(oi.qty_delivered * oi.unit_price), 2),
         round(sum(oi.qty_delivered * (oi.unit_price - oi.unit_cost)), 2),
         round(sum(oi.qty_delivered) * coalesce(cpb, 0) * case when c.is_satellite then 2.2 else 1 end, 2),
         round(sum(oi.qty_delivered * (oi.unit_price - oi.unit_cost)) - sum(oi.qty_delivered) * coalesce(cpb, 0) * case when c.is_satellite then 2.2 else 1 end, 2)
  from public.customers c join public.orders o on o.customer_id = c.id join public.order_items oi on oi.order_id = o.id
  where o.delivery_date between p_from and p_to and o.status in ('entregado','con_novedad')
  group by c.id, c.name, c.zone, c.is_satellite;
end $$;

create or replace function public.route_performance(p_from date, p_to date) returns table (
  truck text, routes bigint, km numeric, cost numeric, stops bigint, otif numeric, cost_per_stop numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin','direccion','logistica']::public.app_role[]) then raise exception 'No autorizado'; end if;
  return query
  select t.name, count(distinct r.id), round(sum(distinct_r.k), 1), round(sum(distinct_r.c), 2), count(s.id),
         round(avg(case when o.on_time and o.in_full then 1.0 else 0 end), 4),
         round(sum(distinct_r.c) / nullif(count(s.id), 0), 2)
  from public.trucks t
  join public.routes r on r.truck_id = t.id and r.date between p_from and p_to and r.status = 'finalizada'
  join lateral (select coalesce(r.km_real, r.km_planned) / greatest(1, (select count(*) from public.route_stops x where x.route_id = r.id)) k,
                       r.cost / greatest(1, (select count(*) from public.route_stops x where x.route_id = r.id)) c) distinct_r on true
  join public.route_stops s on s.route_id = r.id
  join public.orders o on o.id = s.order_id
  group by t.name order by t.name;
end $$;

create or replace function public.seller_performance(p_from date, p_to date) returns table (
  seller text, customers bigint, orders bigint, presale_orders bigint, revenue numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin','direccion','ventas']::public.app_role[]) then raise exception 'No autorizado'; end if;
  return query
  select p.full_name, count(distinct c.id), count(distinct o.id), count(distinct o.id) filter (where o.channel = 'preventa'), round(sum(o.total), 2)
  from public.profiles p join public.customers c on c.seller_id = p.id
  join public.orders o on o.customer_id = c.id and o.delivery_date between p_from and p_to and o.status in ('entregado','con_novedad')
  where p.role = 'preventista' group by p.full_name order by 5 desc;
end $$;

-- Informe para proveedores: solo agregados de sus propios productos, sin identificar comercios.
create or replace function public.supplier_report(p_from date, p_to date, p_supplier uuid default null) returns table (
  month date, product text, zone text, units bigint, revenue numeric, in_full_pct numeric, stores_reached bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_supplier uuid;
begin
  if public.auth_role() = 'proveedor' then v_supplier := public.auth_supplier_id();
  elsif public.has_role(array['admin','direccion']::public.app_role[]) then v_supplier := p_supplier;
  else raise exception 'No autorizado'; end if;
  if v_supplier is null then raise exception 'Proveedor no indicado'; end if;
  return query
  select date_trunc('month', o.delivery_date)::date, p.name,
         case when c.is_satellite then 'Localidades de la región' when c.zone = 'centro' then 'Tandil centro' else 'Tandil barrios' end,
         sum(oi.qty_delivered)::bigint, round(sum(oi.qty_delivered * oi.unit_price), 2),
         round(avg(case when oi.qty_delivered >= oi.qty then 1.0 else 0 end), 4), count(distinct o.customer_id)
  from public.order_items oi join public.products p on p.id = oi.product_id
  join public.orders o on o.id = oi.order_id join public.customers c on c.id = o.customer_id
  where p.supplier_id = v_supplier and o.delivery_date between p_from and p_to and o.status in ('entregado','con_novedad')
  group by 1, 2, 3;
end $$;

revoke execute on function public.kpi_monthly(date, date), public.customer_profitability(date, date), public.route_performance(date, date),
  public.seller_performance(date, date), public.supplier_report(date, date, uuid) from public, anon;
grant execute on function public.kpi_monthly(date, date), public.customer_profitability(date, date), public.route_performance(date, date),
  public.seller_performance(date, date), public.supplier_report(date, date, uuid) to authenticated;
