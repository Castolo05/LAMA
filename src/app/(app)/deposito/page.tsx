import Link from "next/link";
import { ChevronRight, Snowflake } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/format";
import { formatDeliveryDay } from "@/lib/delivery";
import type { OrderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Depósito" };

type Row = {
  id: string; number: number; status: OrderStatus; delivery_date: string; created_at: string;
  customers: { name: string; zone: string } | null;
  order_items: { qty: number; products: { needs_cold: boolean; categories: { line: string } | null } | null }[];
};

export default async function DepositoPage() {
  await requireRole(["deposito", "admin"], "/deposito");
  const supabase = await createClient();
  const [{ data }, { count: prepared }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, status, delivery_date, created_at, customers(name, zone), order_items(qty, products(needs_cold, categories(line)))")
      .in("status", ["recibido", "en_preparacion"])
      .order("delivery_date")
      .order("created_at")
      .returns<Row[]>(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "preparado").is("route_id", null),
  ]);
  const rows = data ?? [];
  const groups = new Map<string, Row[]>();
  for (const r of rows) groups.set(r.delivery_date, [...(groups.get(r.delivery_date) ?? []), r]);
  const bultos = rows.reduce((s, r) => s + r.order_items.reduce((a, i) => a + i.qty, 0), 0);
  const coldOrders = rows.filter((r) => r.order_items.some((i) => i.products?.needs_cold)).length;

  return (
    <>
      <PageHeader title="Pedidos a preparar" description="Armá cada pedido separando secos, frescos y frío. Si falta algo, cargá la cantidad real: el cliente recibe el aviso." />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Por preparar" value={String(rows.length)} />
        <Stat label="Bultos" value={String(bultos)} />
        <Stat label="Con cadena de frío" value={String(coldOrders)} />
        <Stat label="Preparados sin ruta" value={String(prepared ?? 0)} delta="Listos para el planificador" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No hay pedidos pendientes" description="Los pedidos nuevos del portal, la preventa y el teléfono aparecen acá." />
      ) : (
        [...groups.entries()].map(([date, list]) => (
          <section key={date} className="mb-8">
            <h2 className="mb-3 font-display text-lg font-bold">Entrega {formatDeliveryDay(date)} <span className="text-sm font-medium text-lama-steel">· {formatDate(date)}</span></h2>
            <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {list.map((o) => {
                const lines = new Set(o.order_items.map((i) => (i.products?.needs_cold ? (i.products.categories?.line === "congelados" ? "Frío" : "Frescos") : "Secos")));
                return (
                  <li key={o.id}>
                    <Link href={`/deposito/${o.id}`} className="flex items-center gap-3 rounded-xl border border-lama-line bg-white p-4 hover:border-lama-red">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="font-display font-bold">#{o.number}</span><StatusBadge status={o.status} /></div>
                        <p className="truncate text-sm">{o.customers?.name}</p>
                        <p className="text-xs text-lama-steel">{o.order_items.length} ítems · {o.order_items.reduce((a, i) => a + i.qty, 0)} bultos · entró {formatTime(o.created_at)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[...lines].map((l) => <Badge key={l} tone={l === "Secos" ? "neutral" : "dark"}>{l !== "Secos" && <Snowflake className="h-3 w-3" />}{l}</Badge>)}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-lama-steel" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
