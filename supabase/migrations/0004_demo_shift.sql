-- Mantiene la demo "viva": corre todas las fechas para que el último día sembrado sea hoy (pg_cron diario 00:05 ART)
-- Definición idéntica a la del final de supabase/seed/03_today.sql
create or replace function public.demo_shift_dates() returns int
language plpgsql security definer set search_path = '' as $$
declare anchor date; delta int; iv interval;
begin
  select (value #>> '{}')::date into anchor from public.settings where key = 'demo_anchor_date';
  delta := (now() at time zone 'America/Argentina/Buenos_Aires')::date - anchor;
  if anchor is null or delta <= 0 then return 0; end if;
  iv := make_interval(days => delta);
  update public.orders set delivery_date = delivery_date + delta, created_at = created_at + iv, delivered_at = delivered_at + iv;
  update public.routes set date = date + delta, started_at = started_at + iv, finished_at = finished_at + iv, created_at = created_at + iv;
  update public.route_stops set eta = eta + iv, delivered_at = delivered_at + iv;
  update public.invoices set issued_on = issued_on + delta, due_on = due_on + delta;
  update public.payments set paid_on = paid_on + delta;
  update public.tickets set created_at = created_at + iv;
  update public.ticket_messages set created_at = created_at + iv;
  update public.telemetry_events set ts = ts + iv;
  update public.maintenance_alerts set created_at = created_at + iv;
  update public.promotions set starts_on = starts_on + delta, ends_on = ends_on + delta;
  update public.customers set created_at = created_at + iv;
  update public.audit_log set ts = ts + iv;
  update public.settings set value = to_jsonb((anchor + delta)::text) where key = 'demo_anchor_date';
  return delta;
end $$;
revoke execute on function public.demo_shift_dates() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('lama-demo-shift', '5 3 * * *', 'select public.demo_shift_dates()');
