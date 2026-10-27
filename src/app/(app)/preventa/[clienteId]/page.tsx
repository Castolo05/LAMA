import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/lib/server/catalog";
import { todayBA } from "@/lib/delivery";
import { formatARS, formatDate } from "@/lib/format";
import { OrderBuilder } from "@/components/orders/OrderBuilder";
import { StatusBadge } from "@/components/orders/StatusBadge";
import type { OrderStatus } from "@/lib/types";

export default async function PreventaClientePage({ params, searchParams }: { params: Promise<{ clienteId: string }>; searchParams: Promise<{ pedido?: string }> }) {
  const { profile } = await requireRole(["preventista", "admin"], "/preventa");
  const { clienteId } = await params;
  const { pedido } = await searchParams;
  const supabase = await createClient();
  const { data: c } = await supabase.from("customers").select("id, name, address, phone, payment_terms_days").eq("id", clienteId).single();
  if (!c) notFound();
  const [{ data: orders }, catalog] = await Promise.all([
    supabase.from("orders").select("id, number, status, delivery_date, total").eq("customer_id", clienteId).order("created_at", { ascending: false }).limit(5),
    getCatalog(),
  ]);
  const created = pedido ? (orders ?? []).find((o) => o.id === pedido) : null;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/preventa" className="text-sm text-lama-steel hover:text-lama-red">← Mis clientes</Link>
        <h1 className="energetic mt-1 text-3xl">{c.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-lama-steel">
          {c.address}
          {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 font-semibold text-lama-red"><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
        </p>
      </div>
      {created && (
        <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="h-5 w-5" /> Pedido #{created.number} cargado por {formatARS(Number(created.total))}. Entra al circuito de depósito igual que un pedido web.
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-lama-line bg-white">
        <table className="w-full text-sm">
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-lama-line last:border-0">
                <td className="px-4 py-2.5 font-semibold">#{o.number}</td>
                <td className="px-4 py-2.5 text-lama-steel">Entrega {formatDate(o.delivery_date)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={o.status as OrderStatus} /></td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatARS(Number(o.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <OrderBuilder
        storageKey={`lama-presale-${profile.id}-${c.id}`}
        products={catalog.products}
        promos={catalog.promos}
        today={todayBA()}
        customerId={c.id}
        channel="preventa"
        afterHref={`/preventa/${c.id}`}
      />
    </div>
  );
}
