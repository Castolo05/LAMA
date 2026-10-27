import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, MapPin } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatARS, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { formatDeliveryDay } from "@/lib/delivery";
import { CHANNEL_LABEL, type Channel, type OrderStatus } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { StatusTimeline } from "@/components/orders/StatusTimeline";
import { RepeatOrderButton } from "@/components/orders/RepeatOrderButton";
import { CancelButton } from "./CancelButton";
import TruckMap from "./TruckMapClient";
import type { TrackStop } from "@/components/maps/TruckMap";

type Order = {
  id: string; number: number; status: OrderStatus; channel: Channel; delivery_date: string; total: number; created_at: string;
  delivered_at: string | null; on_time: boolean | null; in_full: boolean | null; customer_id: string;
  customers: { name: string; address: string } | null;
  order_items: { id: string; qty: number; unit_price: number; qty_prepared: number | null; qty_delivered: number | null; product_id: string; products: { name: string; unit: string } | null }[];
};
type Tracking = { route_status: string; truck: string; driver: string; stops: (TrackStop & { eta: string | null })[] } | null;

const MIN_PER_STOP = 18;

export default async function PedidoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { profile } = await requireRole(null, "/pedidos");
  const { id } = await params;
  const { nuevo } = await searchParams;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("*, customers(name, address), order_items(id, qty, unit_price, qty_prepared, qty_delivered, product_id, products(name, unit))")
    .eq("id", id)
    .single<Order>();
  if (!o) notFound();

  let tracking: Tracking = null;
  if (o.status === "en_reparto") {
    const { data } = await supabase.rpc("order_tracking", { p_order: id });
    tracking = data as Tracking;
  }
  const mine = tracking?.stops.find((s) => s.mine);
  const before = tracking ? tracking.stops.filter((s) => !s.done && s.seq < (mine?.seq ?? 0)).length : 0;
  const eta = new Date(Date.now() + (before * MIN_PER_STOP + 12) * 60_000);
  const isClient = profile.role === "cliente";
  const canCancel = (isClient && o.status === "recibido") || (["ventas", "admin"].includes(profile.role) && ["recibido", "en_preparacion", "preparado"].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/pedidos" className="text-sm text-lama-steel hover:text-lama-red">← Pedidos</Link>
          <h1 className="energetic mt-1 text-3xl">Pedido #{o.number}</h1>
          <p className="mt-1 text-sm text-lama-steel">
            {!isClient && <>{o.customers?.name} · </>}Hecho el {formatDateTime(o.created_at)} por {CHANNEL_LABEL[o.channel].toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={o.status} />
          {isClient && <RepeatOrderButton variant="outline" items={o.order_items.map((i) => ({ productId: i.product_id, qty: i.qty }))} />}
          {canCancel && <CancelButton orderId={o.id} />}
        </div>
      </div>

      {nuevo && (
        <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="h-5 w-5" /> ¡Listo! Recibimos tu pedido. Llega el {formatDeliveryDay(o.delivery_date)}.
        </p>
      )}

      <Card className="p-5">
        <StatusTimeline status={o.status} />
      </Card>

      {tracking && mine && (
        <Card className="overflow-hidden">
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <h2 className="font-display text-xl font-bold">Tu pedido está en camino</h2>
              <p className="mt-1 text-sm text-lama-steel">
                {tracking.truck} · chofer {tracking.driver}. {before === 0 ? "Sos la próxima parada." : `Hay ${before} ${before === 1 ? "parada" : "paradas"} antes que la tuya.`}
              </p>
            </div>
            <div className="rounded-lg bg-lama-red p-4 text-white">
              <p className="flex items-center gap-1.5 text-sm text-white/85"><Clock className="h-4 w-4" /> Llegada estimada</p>
              <p className="font-display text-3xl font-bold tabular-nums">{formatTime(eta)}</p>
            </div>
          </div>
          <TruckMap stops={tracking.stops} />
          <p className="px-5 py-3 text-xs text-lama-steel">Posición estimada a partir de las entregas confirmadas por el chofer.</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Productos" />
          <Table>
            <thead>
              <tr><th>Producto</th><th className="text-right">Pedido</th>{o.order_items.some((i) => i.qty_delivered !== null) && <th className="text-right">Entregado</th>}<th className="text-right">Precio</th><th className="text-right">Subtotal</th></tr>
            </thead>
            <tbody>
              {o.order_items.map((i) => {
                const q = i.qty_delivered ?? i.qty_prepared ?? i.qty;
                return (
                  <tr key={i.id}>
                    <td><p className="font-medium">{i.products?.name}</p><p className="text-xs text-lama-steel">{i.products?.unit}</p></td>
                    <td className="text-right tabular-nums">{i.qty}</td>
                    {o.order_items.some((x) => x.qty_delivered !== null) && <td className={i.qty_delivered !== null && i.qty_delivered < i.qty ? "text-right font-semibold text-warn tabular-nums" : "text-right tabular-nums"}>{i.qty_delivered ?? "—"}</td>}
                    <td className="text-right tabular-nums whitespace-nowrap">{formatARS(Number(i.unit_price))}</td>
                    <td className="text-right font-semibold tabular-nums whitespace-nowrap">{formatARS(Number(i.unit_price) * q)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="flex justify-between border-t border-lama-line px-4 py-3 font-display text-lg font-bold"><span>Total</span><span className="tabular-nums">{formatARS(Number(o.total))}</span></p>
        </Card>
        <Card>
          <CardHeader title="Entrega" />
          <div className="space-y-3 p-5 text-sm">
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-lama-red" /> {o.customers?.address}</p>
            <p><span className="text-lama-steel">Fecha:</span> {formatDate(o.delivery_date)}</p>
            {o.delivered_at && <p><span className="text-lama-steel">Entregado:</span> {formatDateTime(o.delivered_at)}</p>}
            {o.status === "con_novedad" && <p className="rounded-lg bg-warn-soft px-3 py-2 text-warn">La entrega tuvo una novedad. Si falta algo, abrí un reclamo y lo resolvemos.</p>}
            {isClient && <Link href={`/reclamos?pedido=${o.id}`} className="inline-block font-semibold text-lama-red hover:underline">Reclamar por este pedido</Link>}
          </div>
        </Card>
      </div>
    </div>
  );
}
