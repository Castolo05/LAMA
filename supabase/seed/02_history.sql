-- Seed 2/3 — 180 días de historia: pedidos, rutas, entregas, facturas y pagos.
-- Tendencias: canal digital 5 % → 45 %, OTIF ~80 % → ~93 %, km por parada en baja.
do $$
declare
  d date; start_d date := current_date - 180; prog numeric; months_ago numeric;
  cu record; v_order uuid; v_route uuid; r numeric; ch order_channel; n_items int;
  trucks uuid[]; drivers uuid[]; t int; on_t boolean; in_f boolean; km numeric; stops int; v_created timestamptz;
  p_order numeric; mult int;
begin
  perform set_config('timezone', 'America/Argentina/Buenos_Aires', true);
  perform setseed(0.1234);
  select array_agg(id order by plate) into trucks from trucks;
  select array_agg(d.id order by t.plate) into drivers from drivers d join trucks t on t.id = d.truck_id;

  d := start_d;
  while d < current_date loop
    if extract(isodow from d) <> 7 then
      prog := (d - start_d)::numeric / 180;
      months_ago := (current_date - d)::numeric / 30;
      -- una ruta por camión (se crean vacías y se eliminan si no tienen paradas)
      for t in 1..6 loop
        insert into routes (date, truck_id, driver_id, status, started_at, finished_at)
        values (d, trucks[t], drivers[t], 'finalizada', d + time '07:30', d + time '15:00' + (random() * 120 || ' minutes')::interval);
      end loop;

      for cu in select c.*, row_number() over (order by c.created_at) as idx from customers c where c.status = 'aprobado' loop
        if cu.is_satellite then
          p_order := case when extract(isodow from d) in (2, 5) then 0.7 else 0 end;
        else
          p_order := case cu.kind when 'supermercado' then 0.55 when 'almacen' then 0.36 when 'kiosco' then 0.28 else 0.33 end;
        end if;
        continue when random() >= p_order;

        r := random();
        ch := case when r < 0.05 + 0.40 * prog then 'portal'
                   when r < 0.05 + 0.40 * prog + (0.95 - 0.40 * prog) * 0.7 then 'preventa'
                   else 'telefono' end;
        v_created := (d - case when extract(isodow from d) = 1 then 2 else 1 end) + time '08:00' + (random() * 540 || ' minutes')::interval;
        t := case when cu.is_satellite then 2 else 1 + (cu.idx % 5)::int end;
        if t = 2 and not cu.is_satellite then t := 6; end if;
        select id into v_route from routes where date = d and truck_id = trucks[t];

        on_t := random() < 0.86 + 0.09 * prog;
        in_f := random() < 0.93 + 0.05 * prog;
        insert into orders (customer_id, channel, status, delivery_date, route_id, on_time, in_full, delivered_at, created_at)
        values (cu.id, ch, case when in_f then 'entregado' else 'con_novedad' end::order_status, d, v_route, on_t, in_f,
                d + time '08:10' + (random() * 420 || ' minutes')::interval, v_created)
        returning id into v_order;

        n_items := 3 + floor(random() * 6)::int;
        mult := case cu.kind when 'supermercado' then 3 when 'gastronomico' then 2 else 1 end;
        insert into order_items (order_id, product_id, qty, unit_price, unit_cost, qty_prepared, qty_delivered)
        select v_order, p.id, q, round(p.price * (1 - 0.022 * months_ago), 2), round(p.cost * (1 - 0.022 * months_ago), 2), q, q
        from (select id, price, cost, (1 + floor(random() * 6)::int) * mult as q
              from products order by random() * case when sku like 'C%' or sku like 'S%' or sku like 'F%' or sku like 'B%' then 0.6 else 1 end
              limit n_items) p;
        if not in_f then
          update order_items set qty_delivered = greatest(qty - 1 - floor(random() * 2)::int, 0)
           where id = (select id from order_items where order_id = v_order limit 1);
        end if;
        update orders set total = (select sum(qty_delivered * unit_price) from order_items where order_id = v_order) where id = v_order;
      end loop;

      -- paradas, km y costo por ruta; borrar rutas vacías
      delete from routes rt where rt.date = d and not exists (select 1 from orders o where o.route_id = rt.id);
      insert into route_stops (route_id, order_id, seq, eta, delivered_at, status)
      select o.route_id, o.id, row_number() over (partition by o.route_id order by c.lat),
             o.delivered_at - (random() * 40 || ' minutes')::interval + case when o.on_time then interval '0' else interval '-70 minutes' end,
             o.delivered_at, case when o.in_full then 'entregada' else 'con_novedad' end::stop_status
      from orders o join customers c on c.id = o.customer_id
      where o.delivery_date = d;
      for v_route, stops in select route_id, count(*) from route_stops s join routes rt on rt.id = s.route_id where rt.date = d group by route_id loop
        km := round((38 + stops * (5.4 - 1.6 * prog) + case when exists (
                select 1 from route_stops s join orders o on o.id = s.order_id join customers c on c.id = o.customer_id
                where s.route_id = v_route and c.is_satellite) then 95 else 0 end) * (0.95 + random()::numeric * 0.15), 1);
        update routes set km_planned = round(km * 0.96, 1), km_real = km, cost = round(km * 1450 + 85000, 2) where id = v_route;
      end loop;
    end if;
    d := d + 1;
  end loop;

  -- facturas de lo entregado
  insert into invoices (customer_id, order_id, number, amount, issued_on, due_on)
  select o.customer_id, o.id, 'A-0003-' || lpad(o.number::text, 8, '0'), o.total, o.delivery_date, o.delivery_date + c.payment_terms_days
  from orders o join customers c on c.id = o.customer_id where o.total > 0;

  -- pagos: la mayoría al día, algunos comercios con deuda vencida
  insert into payments (customer_id, amount, paid_on, method)
  select i.customer_id, i.amount,
         least(current_date - 1, i.due_on + (floor(random() * 10) - 4)::int),
         (array['transferencia', 'transferencia', 'efectivo', 'cheque', 'echeq'])[1 + floor(random() * 5)::int]
  from invoices i join customers c on c.id = i.customer_id
  where i.due_on < current_date - 2
    and random() < case when c.name in ('Almacén Doña Elsa', 'Rotisería Lo de Pocha', 'Kiosco Hospital', 'Almacén El Fortín') then 0.55 else 0.96 end;
end $$;
select count(*) orders, round(avg(case when on_time and in_full then 1 else 0 end), 3) otif,
       (select count(*) from routes) routes, (select count(*) from order_items) items
from orders;
