"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Channel } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function fail(error: { message: string } | null): ActionResult<never> {
  return { ok: false, error: error?.message ?? "No se pudo completar la acción." };
}

export async function placeOrder(customerId: string, items: { product_id: string; qty: number }[], channel: Channel): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", { p_customer: customerId, p_items: items, p_channel: channel });
  if (error) return fail(error);
  revalidatePath("/pedidos");
  return { ok: true, data: data as string };
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_order", { p_order: orderId });
  if (error) return fail(error);
  revalidatePath(`/pedidos/${orderId}`);
  return { ok: true };
}

export async function createTicket(input: { customerId: string; orderId: string | null; kind: string; subject: string; body: string }): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!input.subject.trim() || !input.body.trim()) return { ok: false, error: "Completá el asunto y el mensaje." };
  const { data, error } = await supabase
    .from("tickets")
    .insert({ customer_id: input.customerId, order_id: input.orderId || null, kind: input.kind, subject: input.subject.trim() })
    .select("id")
    .single();
  if (error) return fail(error);
  const { error: e2 } = await supabase.from("ticket_messages").insert({ ticket_id: data.id, author_id: user!.id, body: input.body.trim() });
  if (e2) return fail(e2);
  revalidatePath("/reclamos");
  return { ok: true, data: data.id };
}

export async function replyTicket(ticketId: string, body: string, markAs?: "respondido" | "cerrado" | "abierto"): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!body.trim() && !markAs) return { ok: false, error: "Escribí un mensaje." };
  if (body.trim()) {
    const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, author_id: user!.id, body: body.trim() });
    if (error) return fail(error);
  }
  if (markAs) {
    const { error } = await supabase.from("tickets").update({ status: markAs }).eq("id", ticketId);
    if (error) return fail(error);
  }
  revalidatePath("/reclamos");
  revalidatePath("/ventas/reclamos");
  return { ok: true };
}

export async function addEmployee(email: string, fullName: string, password: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_add_employee", { p_email: email, p_full_name: fullName, p_password: password });
  if (error) return fail(error);
  revalidatePath("/mi-comercio");
  return { ok: true };
}
