-- Ítems de una parada para el chofer (sin abrirle el catálogo, según la matriz de permisos).
create or replace function public.driver_stop_items(p_stop uuid) returns table (item_id uuid, name text, unit text, qty int, qty_prepared int, qty_delivered int)
language plpgsql stable security definer set search_path = '' as $$
declare v_route uuid;
begin
  select route_id into v_route from public.route_stops where id = p_stop;
  if not (public.driver_has_route(v_route) or public.has_role(array['admin','logistica']::public.app_role[])) then raise exception 'No autorizado'; end if;
  return query
    select oi.id, p.name, p.unit, oi.qty, oi.qty_prepared, oi.qty_delivered
    from public.route_stops s join public.order_items oi on oi.order_id = s.order_id join public.products p on p.id = oi.product_id
    where s.id = p_stop order by p.name;
end $$;
revoke execute on function public.driver_stop_items(uuid) from public, anon;
grant execute on function public.driver_stop_items(uuid) to authenticated;
