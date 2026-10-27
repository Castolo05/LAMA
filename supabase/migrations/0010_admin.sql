-- Administración de usuarios internos (solo admin).
create or replace function public.admin_create_user(p_email text, p_full_name text, p_role public.app_role, p_password text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.has_role(array['admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  if p_role in ('cliente', 'chofer', 'proveedor') then raise exception 'Los clientes se registran desde el portal; choferes y proveedores se vinculan desde la base'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña debe tener al menos 8 caracteres'; end if;
  uid := public.create_auth_user(p_email, p_password, p_full_name);
  update public.profiles set role = p_role, full_name = p_full_name where id = uid;
  return uid;
end $$;

create or replace function public.admin_update_user(p_user uuid, p_role public.app_role, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin']::public.app_role[]) then raise exception 'No autorizado'; end if;
  if p_user = auth.uid() and (p_role <> 'admin' or not p_active) then raise exception 'No podés quitarte tu propio acceso de administrador'; end if;
  update public.profiles set role = p_role, active = p_active where id = p_user;
end $$;

revoke execute on function public.admin_create_user(text, text, public.app_role, text), public.admin_update_user(uuid, public.app_role, boolean) from public, anon;
grant execute on function public.admin_create_user(text, text, public.app_role, text), public.admin_update_user(uuid, public.app_role, boolean) to authenticated;
