import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatARS, formatDate } from "@/lib/format";
import { CHANNEL_LABEL, STATUS_LABEL, type Channel, type OrderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Pedidos" };

type Row = { id: string; number: number; status: OrderStatus; channel: Channel; delivery_date: string; total: number; created_at: string; customers: { name: string } | null };

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ estado?: string; canal?: string; q?: string }> }) {
  const { profile } = await requireRole(null, "/pedidos");
  const sp = await searchParams;
  const isClient = profile.role === "cliente";
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, number, status, channel, delivery_date, total, created_at, customers(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(60);
  if (sp.estado) query = query.eq("status", sp.estado);
  if (sp.canal) query = query.eq("channel", sp.canal);
  if (sp.q && /^\d+$/.test(sp.q)) query = query.eq("number", Number(sp.q));
  const { data, count } = await query.returns<Row[]>();
  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title={isClient ? "Mis pedidos" : "Pedidos"}
        description={isClient ? "Seguí el estado de cada pedido y repetí los que hacés seguido." : `${count ?? 0} pedidos con los filtros elegidos. Se muestran los 60 más recientes.`}
        actions={isClient && <LinkButton href="/catalogo">Nuevo pedido</LinkButton>}
      />
      {!isClient && (
        <form className="mb-4 flex flex-wrap gap-2 text-sm">
          <input name="q" defaultValue={sp.q} placeholder="N° de pedido" className="h-10 w-36 rounded-[10px] border border-lama-line bg-white px-3" />
          <select name="estado" defaultValue={sp.estado ?? ""} className="h-10 rounded-[10px] border border-lama-line bg-white px-3">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="canal" defaultValue={sp.canal ?? ""} className="h-10 rounded-[10px] border border-lama-line bg-white px-3">
            <option value="">Todos los canales</option>
            {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="h-10 rounded-[10px] bg-lama-ink px-4 font-semibold text-white">Filtrar</button>
        </form>
      )}
      {rows.length === 0 ? (
        <EmptyState title="No hay pedidos para mostrar" description={isClient ? "Tu primer pedido aparece acá apenas lo confirmes." : "Probá cambiar los filtros."} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Pedido</th>
                {!isClient && <th>Comercio</th>}
                <th>Entrega</th>
                <th>Canal</th>
                <th>Estado</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-lama-cloud/60">
                  <td><Link href={`/pedidos/${o.id}`} className="font-semibold hover:text-lama-red">#{o.number}</Link></td>
                  {!isClient && <td className="max-w-[220px] truncate">{o.customers?.name}</td>}
                  <td className="whitespace-nowrap">{formatDate(o.delivery_date)}</td>
                  <td className="whitespace-nowrap text-lama-steel">{CHANNEL_LABEL[o.channel]}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-right font-semibold tabular-nums whitespace-nowrap">{formatARS(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
