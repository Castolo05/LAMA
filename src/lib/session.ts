import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { canAccess, homeForRole } from "./nav";
import type { Profile, Role } from "./types";

export type CustomerInfo = { id: string; name: string; status: "pendiente" | "aprobado" | "rechazado"; address: string };

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  let customer: CustomerInfo | null = null;
  if (profile.customer_id) {
    const { data } = await supabase.from("customers").select("id,name,status,address").eq("id", profile.customer_id).single<CustomerInfo>();
    customer = data;
  }
  return { user, profile, customer };
});

/** Exige sesión y que el rol pueda ver la ruta; si no, redirige. */
export async function requireRole(roles: Role[] | null, path?: string) {
  const s = await getSession();
  if (!s) redirect("/ingresar");
  const role = s.profile.role;
  if (!s.profile.active) redirect("/ingresar?error=inactivo");
  if (role === "cliente" && s.customer?.status !== "aprobado" && path !== "/en-revision") redirect("/en-revision");
  if ((roles && !roles.includes(role)) || (path && !canAccess(role, path) && path !== "/en-revision")) redirect(homeForRole(role));
  return s;
}
