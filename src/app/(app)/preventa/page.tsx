import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Mis clientes" };

const KIND: Record<string, string> = { almacen: "Almacén", kiosco: "Kiosco", gastronomico: "Gastronómico", supermercado: "Autoservicio" };

export default async function PreventaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireRole(["preventista", "admin"], "/preventa");
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("customers").select("id, name, address, kind, zone, orders(delivery_date)").eq("status", "aprobado").order("name");
  if (profile.role === "preventista") query = query.eq("seller_id", profile.id);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const rows = (data ?? []).map((c) => ({
    ...c,
    last: (c.orders as { delivery_date: string }[]).reduce((m, o) => (o.delivery_date > m ? o.delivery_date : m), ""),
  }));
  return (
    <>
      <PageHeader title="Mis clientes" description={`${rows.length} comercios en tu cartera. Tocá uno para ver su historial y tomarle el pedido.`} />
      <form className="mb-4 flex">
        <input name="q" defaultValue={q} placeholder="Buscar comercio" className="h-11 min-w-0 flex-1 rounded-l-[10px] border border-r-0 border-lama-line bg-white px-3 text-sm" />
        <button className="h-11 rounded-r-[10px] bg-lama-ink px-4 text-sm font-semibold text-white">Buscar</button>
      </form>
      <ul className="grid gap-2 md:grid-cols-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/preventa/${c.id}`} className="flex items-center gap-3 rounded-xl border border-lama-line bg-white p-4 hover:border-lama-red">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="flex items-center gap-1 truncate text-sm text-lama-steel"><MapPin className="h-3.5 w-3.5 shrink-0" />{c.address}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge>{KIND[c.kind]}</Badge>
                  {c.last && <Badge tone="neutral">Último pedido para el {formatDate(c.last)}</Badge>}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-lama-steel" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
