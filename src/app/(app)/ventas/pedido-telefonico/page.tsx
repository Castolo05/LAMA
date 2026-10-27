import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/lib/server/catalog";
import { todayBA } from "@/lib/delivery";
import { PageHeader } from "@/components/ui/PageHeader";
import { OrderBuilder } from "@/components/orders/OrderBuilder";

export const metadata = { title: "Pedido telefónico" };

export default async function PedidoTelefonicoPage({ searchParams }: { searchParams: Promise<{ cliente?: string; pedido?: string }> }) {
  const { profile } = await requireRole(["ventas", "admin"], "/ventas/pedido-telefonico");
  const { cliente, pedido } = await searchParams;
  const supabase = await createClient();
  const { data: customers } = await supabase.from("customers").select("id, name").eq("status", "aprobado").order("name");
  const selected = (customers ?? []).find((c) => c.id === cliente);
  const catalog = selected ? await getCatalog() : null;
  return (
    <>
      <PageHeader title="Pedido telefónico" description="Cargá el pedido de un cliente que llama. Entra al mismo circuito que los pedidos web." />
      {pedido && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="h-5 w-5" /> Pedido cargado. <Link href={`/pedidos/${pedido}`} className="underline">Ver pedido</Link>
        </p>
      )}
      <form className="mb-6 flex max-w-xl gap-2">
        <label htmlFor="cliente" className="sr-only">Cliente</label>
        <select id="cliente" name="cliente" defaultValue={cliente ?? ""} className="h-11 min-w-0 flex-1 rounded-[10px] border border-lama-line bg-white px-3 text-sm">
          <option value="" disabled>Elegí el comercio que llama</option>
          {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="h-11 rounded-[10px] bg-lama-ink px-4 text-sm font-semibold text-white">Elegir</button>
      </form>
      {selected && catalog && (
        <OrderBuilder
          key={selected.id}
          storageKey={`lama-phone-${profile.id}-${selected.id}`}
          products={catalog.products}
          promos={catalog.promos}
          today={todayBA()}
          customerId={selected.id}
          channel="telefono"
          afterHref={`/ventas/pedido-telefonico?cliente=${selected.id}`}
        />
      )}
    </>
  );
}
