-- Seed 3/3 — estado "de hoy": rutas en curso, pedidos para depósito y planificador, reclamos, telemetría.
-- Además: demo_shift_dates() + pg_cron diario para que "hoy" siempre tenga datos en la demo.
do $$
declare
  today date; tomorrow date; trucks uuid[]; drivers uuid[]; v_route uuid; v_order uuid; cu record;
  i int; n_items int; st order_status; pend int; v_ticket uuid; staff uuid; tk uuid; k int;
  tito uuid := (select id from customers where name = 'Almacén Don Tito');
begin
  perform set_config('timezone', 'America/Argentina/Buenos_Aires', true);
  perform setseed(0.777);
  today := current_date;
  tomorrow := next_delivery_date(now());
  select array_agg(id order by name) into trucks from trucks;  -- Camión 01..06
  select array_agg(d.id order by t.name) into drivers from drivers d join trucks t on t.id = d.truck_id;

  -- Rutas de hoy: camión 01 (chofer demo) y camión 04 en curso
  for k in 1..2 loop
    insert into routes (date, truck_id, driver_id, status, started_at, km_planned, cost)
    values (today, trucks[case k when 1 then 1 else 4 end], drivers[case k when 1 then 1 else 4 end], 'en_curso', today + time '07:30', 0, 0)
    returning id into v_route;
    i := 0;
    for cu in
      select * from customers c
      where c.status = 'aprobado' and not c.is_satellite and c.name not in ('Kiosco La Esquina')
        and (case when k = 1 then c.lat > -37.326 or c.name = 'Almacén Don Tito' else c.lat <= -37.326 and c.name <> 'Almacén Don Tito' end)
      order by random() limit 9
    loop
      i := i + 1;
      pend := case when i <= 3 then 0 else 1 end;  -- las primeras 3 paradas ya entregadas
      insert into orders (customer_id, channel, status, delivery_date, route_id, on_time, in_full, delivered_at, created_at)
      values (cu.id, case when random() < 0.5 then 'portal' else 'preventa' end::order_channel,
              case when pend = 0 then 'entregado' else 'en_reparto' end::order_status, today, v_route,
              case when pend = 0 then true end, case when pend = 0 then true end,
              case when pend = 0 then today + time '08:00' + (i * 25 || ' minutes')::interval end,
              today - 1 + time '10:00' + (random() * 400 || ' minutes')::interval)
      returning id into v_order;
      n_items := 3 + floor(random() * 4)::int;
      insert into order_items (order_id, product_id, qty, unit_price, unit_cost, qty_prepared, qty_delivered)
      select v_order, p.id, q, p.price, p.cost, q, case when pend = 0 then q end
      from (select id, price, cost, 1 + floor(random() * 5)::int q from products order by random() limit n_items) p;
      update orders set total = (select sum(qty * unit_price) from order_items where order_id = v_order) where id = v_order;
      insert into route_stops (route_id, order_id, seq, eta, delivered_at, status)
      values (v_route, v_order, i, today + time '08:00' + (i * 35 || ' minutes')::interval,
              case when pend = 0 then today + time '08:00' + (i * 25 || ' minutes')::interval end,
              case when pend = 0 then 'entregada' else 'pendiente' end::stop_status);
      if pend = 0 then
        insert into invoices (customer_id, order_id, number, amount, issued_on, due_on)
        select cu.id, o.id, 'A-0003-' || lpad(o.number::text, 8, '0'), o.total, today, today + cu.payment_terms_days from orders o where o.id = v_order;
      end if;
    end loop;
    update routes set km_planned = 38 + i * 4.2, cost = round((38 + i * 4.2) * 1450 + 85000, 2) where id = v_route;
  end loop;

  -- Don Tito queda como parada 4 (en reparto) del camión 01, para el seguimiento
  update orders set customer_id = tito, channel = 'portal'
   where id = (select s.order_id from route_stops s join routes r on r.id = s.route_id
               where r.date = today and r.truck_id = trucks[1] and s.seq = 4);

  -- Pedidos para la próxima entrega: recibidos (depósito), en preparación y preparados (planificador)
  i := 0;
  for cu in select * from customers c where c.status = 'aprobado' and c.name <> 'Almacén Don Tito' order by random() limit 30 loop
    i := i + 1;
    st := case when i <= 9 then 'recibido' when i <= 11 then 'en_preparacion' else 'preparado' end;
    insert into orders (customer_id, channel, status, delivery_date, created_at)
    values (cu.id, (array['portal','portal','preventa','telefono'])[1 + floor(random() * 4)::int]::order_channel, st, tomorrow,
            now() - (random() * 300 || ' minutes')::interval)
    returning id into v_order;
    n_items := 3 + floor(random() * 5)::int;
    insert into order_items (order_id, product_id, qty, unit_price, unit_cost, qty_prepared)
    select v_order, p.id, q, p.price, p.cost, case when st = 'preparado' then q end
    from (select id, price, cost, (1 + floor(random() * 6)::int) * case when cu.kind = 'supermercado' then 3 else 1 end q
          from products order by random() limit n_items) p;
    update orders set total = (select sum(qty * unit_price) from order_items where order_id = v_order) where id = v_order;
  end loop;
  -- Don Tito: un pedido recibido para mañana además del que está en reparto
  insert into orders (customer_id, channel, status, delivery_date, created_at, created_by)
  values (tito, 'portal', 'recibido', tomorrow, now() - interval '50 minutes', (select id from profiles where email = 'cliente@demo.lama.com.ar'))
  returning id into v_order;
  insert into order_items (order_id, product_id, qty, unit_price, unit_cost)
  select v_order, id, q, price, cost from (select id, price, cost, 2 + floor(random() * 4)::int q from products where sku in ('CC-0225','CZ-0225','LS-LE01','ST-YM01','CH-SATA')) p;
  update orders set total = (select sum(qty * unit_price) from order_items where order_id = v_order) where id = v_order;

  -- Don Tito: pedidos históricos por portal (para "repetir último pedido" y sugerencias) y deuda reciente sin pagar
  update orders set channel = 'portal' where customer_id = tito and delivery_date > today - 60;
  delete from payments where customer_id = tito and paid_on > today - 12;

  -- Reclamos y consultas
  select id into staff from profiles where email = 'ventas@demo.lama.com.ar';
  for cu in select c.*, row_number() over (order by random()) n from customers c where c.status = 'aprobado' order by random() limit 10 loop
    select id into v_order from orders where customer_id = cu.id and status in ('entregado', 'con_novedad') order by delivery_date desc limit 1;
    insert into tickets (customer_id, order_id, kind, status, subject, created_at)
    values (cu.id, v_order, (array['rotura','faltante','demora','consulta','rotura','consulta'])[1 + (cu.n % 6)]::ticket_kind,
            (case when cu.n <= 4 then 'abierto' when cu.n <= 7 then 'respondido' else 'cerrado' end)::ticket_status,
            (array['Llegaron 2 botellas rotas','Faltó un pack en la entrega','El camión llegó tarde','¿Tienen Monster Ultra en stock?','Pack de leche con pérdida','Consulta por plazo de pago'])[1 + (cu.n % 6)],
            now() - (cu.n * 7 || ' hours')::interval)
    returning id into v_ticket;
    insert into ticket_messages (ticket_id, author_id, body, created_at)
    values (v_ticket, null, (array['Hola, en la última entrega vinieron 2 botellas de 2,25 rotas dentro del pack. ¿Pueden reponerlas?',
      'Buenas, pedí 4 packs y llegaron 3. Ya firmé el remito pero lo vi después.',
      'El camión llegó pasadas las 12 y tuvimos que recibir con el local lleno.',
      'Quería saber si tienen Monster Ultra para sumar al próximo pedido.',
      'Uno de los cajones de leche vino con un sachet perdiendo.',
      '¿Podemos pasar a pago a 21 días? Estamos comprando más seguido.'])[1 + (cu.n % 6)], now() - (cu.n * 7 || ' hours')::interval);
    if cu.n > 4 then
      insert into ticket_messages (ticket_id, author_id, body, created_at)
      values (v_ticket, staff, '¡Gracias por avisarnos! Ya lo registramos y lo reponemos en la próxima entrega sin cargo.', now() - (cu.n * 6 || ' hours')::interval);
    end if;
  end loop;
  -- un reclamo de Don Tito
  select id into v_order from orders where customer_id = tito and status = 'entregado' order by delivery_date desc limit 1;
  insert into tickets (customer_id, order_id, kind, status, subject, created_at)
  values (tito, v_order, 'rotura', 'respondido', 'Pack de Coca-Cola 2,25 con una botella rota', now() - interval '2 days') returning id into v_ticket;
  insert into ticket_messages (ticket_id, author_id, body, created_at) values
    (v_ticket, (select id from profiles where email = 'cliente@demo.lama.com.ar'), 'Hola, vino una botella rota en uno de los packs de 2,25.', now() - interval '2 days'),
    (v_ticket, staff, 'Hola Tito, ya lo registramos. Te reponemos la botella en el próximo pedido.', now() - interval '47 hours');

  -- Telemetría simulada (últimos 30 días) y alertas de mantenimiento
  foreach tk in array trucks loop
    insert into telemetry_events (truck_id, ts, kind, value)
    select tk, now() - (random() * 30 || ' days')::interval,
           (array['ralenti','ralenti','frenada_brusca','exceso_velocidad'])[1 + floor(random() * 4)::int]::telemetry_kind,
           round((2 + random() * 18)::numeric, 1)
    from generate_series(1, case when tk = trucks[4] then 140 else 40 + floor(random() * 40)::int end);
  end loop;
  insert into maintenance_alerts (truck_id, severity, message, due_in_days) values
    (trucks[4], 'alta', 'Patrón de frenado anómalo: 3,2× el promedio de la flota. Revisar pastillas y discos.', 5),
    (trucks[3], 'media', 'Temperatura de motor por encima de lo normal en subidas. Revisar sistema de refrigeración.', 12),
    (trucks[5], 'media', 'Service de 20.000 km próximo (faltan 640 km).', 9),
    (trucks[2], 'baja', 'Presión de neumático trasero izquierdo baja en 2 jornadas.', 20);

  insert into settings(key, value) values ('demo_anchor_date', to_jsonb(today::text)) on conflict (key) do update set value = excluded.value;
end $$;

-- demo_shift_dates() y el cron diario están en supabase/migrations/0004_demo_shift.sql
