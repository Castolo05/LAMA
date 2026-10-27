-- Seguimiento del pedido para el cliente: la ruta sin datos de otros comercios (solo coordenadas y estado).
create or replace function public.order_tracking(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare o record; res jsonb;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null then return null; end if;
  if not (public.has_role(array['admin','direccion','ventas','logistica']::public.app_role[])
          or (public.auth_role() = 'cliente' and o.customer_id = public.auth_customer_id())
          or (public.auth_role() = 'preventista' and public.is_seller_of(o.customer_id))) then
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
revoke execute on function public.order_tracking(uuid) from public, anon;
grant execute on function public.order_tracking(uuid) to authenticated;
