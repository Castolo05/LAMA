import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Truck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { homeForRole } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { agingBuckets } from "@/lib/aging";
import { suggestReorder } from "@/lib/suggestions";
import { formatDeliveryDay, todayBA } from "@/lib/delivery";
import { formatARS, formatDate } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { RepeatOrderButton } from "@/components/orders/RepeatOrderButton";
import { SuggestionList } from "@/components/orders/SuggestionList";

export const metadata = { title: "Inicio" };

type OrderRow = { id: string; number: number; status: OrderStatus; delivery_date: string; total: number; created_at: string; order_items: { product_id: string; qty: number }[] };

export default async function InicioPage() {
  const { profile, customer } = await requireRole(null, "/inicio");
  if (profile.role !== "cliente") redirect(homeForRole(profile.role));
  const supabase = await createClient();
  const today = todayBA();
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: orders }, { data: invoices }, { data: payments }, { data: products }] = await Promise.all([
    supabase.from("orders").select("id, number, status, delivery_date, total, created_at, order_items(product_id, qty)").gte("delivery_date", since).order("created_at", { ascending: false }).returns<OrderRow[]>(),
    supabase.from("invoices").select("amount, issued_on, due_on"),
    supabase.from("payments").select("amount"),
    supabase.from("products").select("id, name, unit, price, stock").eq("active", true),
  ]);

  const list = orders ?? [];
  const active = list.find((o) => o.status === "en_reparto") ?? list.find((o) => ["recibido", "en_preparacion", "preparado"].includes(o.status));
  const last = list.find((o) => o.status !== "anulado");
  const balance = agingBuckets(invoices ?? [], payments ?? [], today);

  const history = list.flatMap((o) => o.order_items.map((i) => ({ product_id: i.product_id, ordered_on: o.delivery_date })));
  const lastQty = new Map<string, number>();
  for (const o of [...list].reverse()) for (const i of o.order_items) lastQty.set(i.product_id, i.qty);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const suggestions = suggestReorder(history, today)
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.stock > 0)
    .map((p) => ({ id: p.id, name: p.name, unit: p.unit, price: Number(p.price), lastQty: Math.min(lastQty.get(p.id) ?? 1, p.stock) }));

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="energetic text-3xl">Hola, {firstName}</h1>
        <p className="mt-1 text-sm text-lama-steel">{customer?.name} · {customer?.address}</p>
      </div>

      {active && (
        <Link href={`/pedidos/${active.id}`} className="group block overflow-hidden rounded-xl bg-lama-ink text-white">
          <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
            <span className="flex h-12 w-12 -skew-x-12 items-center justify-center rounded-lg bg-lama-red">
              <Truck className="h-6 w-6 skew-x-12" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/70">Pedido #{active.number}</p>
              <p className="font-display text-xl font-bold">
                {active.status === "en_reparto" ? "Tu pedido está en camino" : `Llega el ${formatDeliveryDay(active.delivery_date)}`}
              </p>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold">
              {active.status === "en_reparto" ? "Ver el camión en el mapa" : "Ver detalle"}
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pedí en un minuto" />
          <div className="flex flex-wrap gap-3 p-5">
            <LinkButton href="/catalogo">Ver catálogo</LinkButton>
            {last && <RepeatOrderButton variant="outline" items={last.order_items.map((i) => ({ productId: i.product_id, qty: i.qty }))} />}
          </div>
          <div className="border-t border-lama-line px-5 pt-4 pb-2">
            <h3 className="text-sm font-bold">Sugeridos para reponer</h3>
            <p className="text-xs text-lama-steel">Según cada cuánto los pedís y cuándo fue la última vez.</p>
          </div>
          <div className="px-5 pb-3">
            <SuggestionList items={suggestions} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Tu cuenta" action={<Link href="/cuenta" className="text-sm font-semibold text-lama-red">Ver detalle</Link>} />
          <div className="space-y-3 p-5">
            <div>
              <p className="text-sm text-lama-steel">Saldo</p>
              <p className="font-display text-3xl font-bold tabular-nums">{formatARS(balance.total)}</p>
            </div>
            <p className="flex justify-between text-sm"><span className="text-lama-steel">A vencer</span><span className="tabular-nums">{formatARS(balance.corriente)}</span></p>
            <p className="flex justify-between text-sm"><span className="text-lama-steel">Vencido</span><span className={balance.vencido > 0 ? "font-semibold text-lama-red tabular-nums" : "tabular-nums"}>{formatARS(balance.vencido)}</span></p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Últimos pedidos" action={<Link href="/pedidos" className="text-sm font-semibold text-lama-red">Ver todos</Link>} />
        <ul className="divide-y divide-lama-line">
          {list.slice(0, 5).map((o) => (
            <li key={o.id}>
              <Link href={`/pedidos/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-lama-cloud/60">
                <span className="w-20 font-semibold">#{o.number}</span>
                <span className="flex-1 text-sm text-lama-steel">Entrega {formatDate(o.delivery_date)}</span>
                <StatusBadge status={o.status} />
                <span className="w-32 text-right font-semibold tabular-nums">{formatARS(Number(o.total))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
