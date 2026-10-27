-- Saldos por cliente con antigüedad de deuda (pagos aplicados FIFO), para Cobranzas, Ventas y Dirección.
create or replace function public.customer_balances() returns table (
  customer_id uuid, name text, seller text, payment_terms_days int, invoiced numeric, paid numeric,
  corriente numeric, d1_30 numeric, d31_60 numeric, d60_mas numeric, total numeric, last_payment date)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin','direccion','ventas','cobranzas']::public.app_role[]) then raise exception 'No autorizado'; end if;
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
  select c.id, c.name, pr.full_name, c.payment_terms_days,
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
  left join public.profiles pr on pr.id = c.seller_id
  where c.status = 'aprobado'
  group by c.id, c.name, pr.full_name, c.payment_terms_days, pay.amt, pay.last_paid;
end $$;
revoke execute on function public.customer_balances() from public, anon;
grant execute on function public.customer_balances() to authenticated;
