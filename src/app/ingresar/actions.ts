"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/nav";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import type { Role } from "@/lib/types";

export type AuthState = { error?: string } | undefined;

async function signInAndGo(email: string, password: string): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email o contraseña incorrectos." };
  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", data.user.id).single<{ role: Role; active: boolean }>();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "Tu usuario está desactivado. Consultá con Lama." };
  }
  redirect(homeForRole(profile.role));
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completá email y contraseña." };
  return signInAndGo(email, password);
}

export async function demoLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  if (!DEMO_ACCOUNTS.some((a) => a.email === email)) return;
  await signInAndGo(email, DEMO_PASSWORD);
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
