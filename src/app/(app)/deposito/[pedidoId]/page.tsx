import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/orders/StatusBadge";
import type { OrderStatus } from "@/lib/types";
import { PickList } from "./PickList";

type O = {
  id: string; number: number; status: OrderStatus; delivery_date: string;
  customers: { name: string; address: string } | null;
  order_items: { id: string; qty: number; products: { name: string; unit: string; stock: number; needs_cold: boolean; categories: { line: string } | null } | null }[];
};

export default async function PrepararPage({ params }: { params: Promise<{ pedidoId: string }> }) {
  await requireRole(["deposito", "admin"], "/deposito");
  const { pedidoId } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("id, number, status, delivery_date, customers(name, address), order_items(id, qty, products(name, unit, stock, needs_cold, categories(line)))")
    .eq("id", pedidoId)
    .single<O>();
  if (!o) notFound();
  const done = !["recibido", "en_preparacion"].includes(o.status);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/deposito" className="text-sm text-lama-steel hover:text-lama-red">← Depósito</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3"><h1 className="energetic text-3xl">Pedido #{o.number}</h1><StatusBadge status={o.status} /></div>
        <p className="mt-1 text-sm text-lama-steel">{o.customers?.name} · {o.customers?.address} · entrega {formatDate(o.delivery_date)}</p>
      </div>
      {done ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">Este pedido ya fue preparado.</p>
      ) : (
        <PickList
          orderId={o.id}
          status={o.status}
          items={o.order_items.map((i) => ({
            id: i.id,
            qty: i.qty,
            name: i.products?.name ?? "",
            unit: i.products?.unit ?? "",
            stock: i.products?.stock ?? 0,
            zone: i.products?.needs_cold ? (i.products.categories?.line === "congelados" ? "Frío" : "Frescos") : "Secos",
          }))}
        />
      )}
    </div>
  );
}
