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

export async function approveCustomer(customerId: string, approve: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_customer", { p_customer: customerId, p_approve: approve });
  if (error) return fail(error);
  revalidatePath("/ventas/clientes");
  return { ok: true };
}

export async function updateProduct(productId: string, patch: { price?: number; stock?: number; active?: boolean }): Promise<ActionResult> {
  const supabase = await createClient();
  if (patch.price !== undefined && (!Number.isFinite(patch.price) || patch.price <= 0)) return { ok: false, error: "Ingresá un precio mayor a cero." };
  if (patch.stock !== undefined && (!Number.isInteger(patch.stock) || patch.stock < 0)) return { ok: false, error: "El stock debe ser un número entero positivo." };
  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) return fail(error);
  revalidatePath("/ventas/precios");
  revalidatePath("/admin/catalogo");
  return { ok: true };
}

export async function createPromotion(productId: string, pct: number, startsOn: string, endsOn: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(pct > 0 && pct < 100)) return { ok: false, error: "El descuento debe estar entre 1 % y 99 %." };
  if (!startsOn || !endsOn || endsOn < startsOn) return { ok: false, error: "Revisá las fechas de la promoción." };
  const { error } = await supabase.from("promotions").insert({ product_id: productId, pct, starts_on: startsOn, ends_on: endsOn });
  if (error) return fail(error);
  revalidatePath("/ventas/precios");
  return { ok: true };
}

export async function deletePromotion(promoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("promotions").delete().eq("id", promoId);
  if (error) return fail(error);
  revalidatePath("/ventas/precios");
  return { ok: true };
}

export async function registerPayment(customerId: string, amount: number, paidOn: string, method: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!(amount > 0)) return { ok: false, error: "Ingresá un importe mayor a cero." };
  const { error } = await supabase.from("payments").insert({ customer_id: customerId, amount, paid_on: paidOn, method });
  if (error) return fail(error);
  revalidatePath("/cobranzas");
  return { ok: true };
}

export async function startPreparing(orderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_preparing", { p_order: orderId });
  if (error) return fail(error);
  revalidatePath("/deposito");
  return { ok: true };
}

export async function prepareOrder(orderId: string, prepared: { item_id: string; qty_prepared: number }[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("prepare_order", { p_order: orderId, p_prepared: prepared });
  if (error) return fail(error);
  revalidatePath("/deposito");
  return { ok: true };
}

export async function confirmRoutes(date: string, plan: { truck_id: string; driver_id: string; km: number; cost: number; stops: { order_id: string; seq: number; eta: string }[] }[]): Promise<ActionResult<number>> {
  const supabase = await createClient();
  if (plan.some((r) => !r.driver_id)) return { ok: false, error: "Asigná un chofer a cada camión antes de confirmar." };
  const { data, error } = await supabase.rpc("confirm_routes", { p_date: date, p_plan: plan });
  if (error) return fail(error);
  revalidatePath("/logistica/rutas");
  return { ok: true, data: data as number };
}

export async function startRoute(routeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_route", { p_route: routeId });
  if (error) return fail(error);
  revalidatePath("/logistica/rutas");
  revalidatePath("/chofer");
  return { ok: true };
}
