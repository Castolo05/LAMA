"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = { error?: string } | undefined;

export async function register(_: RegisterState, formData: FormData): Promise<RegisterState> {
  const f = (k: string) => String(formData.get(k) ?? "").trim();
  const email = f("email");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("public_register", {
    p_email: email,
    p_password: password,
    p_full_name: f("full_name"),
    p_name: f("name"),
    p_kind: f("kind") || "almacen",
    p_address: f("address"),
    p_phone: f("phone"),
    p_cuit: f("cuit") || null,
  });
  if (error) return { error: error.message };
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return { error: "Tu comercio quedó registrado. Ingresá con tu email y contraseña." };
  redirect("/en-revision");
}
