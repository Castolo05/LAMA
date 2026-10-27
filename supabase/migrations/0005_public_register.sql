-- Autoregistro de comercios sin depender de la confirmación por email de Supabase Auth:
-- crea el usuario (confirmado) y el comercio en estado pendiente de aprobación.
create or replace function public.public_register(
  p_email text, p_password text, p_full_name text,
  p_name text, p_kind public.customer_kind, p_address text, p_phone text, p_cuit text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid; v_customer uuid;
begin
  if coalesce(trim(p_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ingresá un email válido'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Ingresá tu nombre'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_address), '') = '' then raise exception 'Completá nombre y dirección del comercio'; end if;
  uid := public.create_auth_user(trim(p_email), p_password, trim(p_full_name));
  insert into public.customers (name, kind, address, phone, cuit, status, lat, lng, zone)
  values (trim(p_name), p_kind, trim(p_address), p_phone, p_cuit, 'pendiente',
          -37.3217 + (random() - 0.5) * 0.03, -59.1332 + (random() - 0.5) * 0.04, 'barrios')
  returning id into v_customer;
  update public.profiles set customer_id = v_customer, is_owner = true, full_name = trim(p_full_name) where id = uid;
  return uid;
end $$;
revoke execute on function public.public_register(text, text, text, text, public.customer_kind, text, text, text) from public;
grant execute on function public.public_register(text, text, text, text, public.customer_kind, text, text, text) to anon, authenticated;
