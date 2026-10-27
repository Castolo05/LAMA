-- Seed 4/4 — reemplaza los eventos técnicos de la carga por un historial de auditoría de muestra.
delete from audit_log;
insert into audit_log (ts, actor_id, action, entity, entity_id, detail)
select now() - v.ago::interval, (select id from profiles where email = v.actor), v.action, v.entity, null, v.detail::jsonb
from (values
  ('9 days 3 hours', 'ventas@demo.lama.com.ar', 'cambio_precio', 'products', '{"producto":"Coca-Cola 2,25 L","antes":20900,"despues":21900}'),
  ('9 days 3 hours', 'ventas@demo.lama.com.ar', 'cambio_precio', 'products', '{"producto":"Coca-Cola Sin Azúcar 2,25 L","antes":20900,"despues":21900}'),
  ('8 days 6 hours', 'ventas@demo.lama.com.ar', 'cliente_aprobado', 'customers', '{"comercio":"Kiosco Lago"}'),
  ('6 days 2 hours', 'admin@demo.lama.com.ar', 'alta_usuario', 'profiles', '{"email":"preventista3@demo.lama.com.ar","rol":"preventista"}'),
  ('5 days 5 hours', 'ventas@demo.lama.com.ar', 'anulacion_pedido', 'orders', '{"pedido":2541}'),
  ('4 days 1 hour', 'ventas@demo.lama.com.ar', 'cambio_precio', 'products', '{"producto":"Yerba mate 1 kg","antes":36900,"despues":38900}'),
  ('3 days 4 hours', 'admin@demo.lama.com.ar', 'cambio_rol', 'profiles', '{"email":"preventista2@demo.lama.com.ar","antes":"ventas","despues":"preventista"}'),
  ('2 days 7 hours', 'ventas@demo.lama.com.ar', 'cliente_rechazado', 'customers', '{"comercio":"Distribuidora Fuera de Zona"}'),
  ('1 day 2 hours', 'ventas@demo.lama.com.ar', 'cambio_precio', 'products', '{"producto":"Leche entera sachet 1 L","antes":13600,"despues":14200}')
) as v(ago, actor, action, entity, detail);
