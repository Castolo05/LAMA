import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export const metadata = { title: "Reclamos" };

const TONE = { abierto: "red", respondido: "ok", cerrado: "neutral" } as const;
const KIND: Record<string, string> = { rotura: "Rotura", faltante: "Faltante", demora: "Demora", consulta: "Consulta", otro: "Otro" };

type Row = { id: string; subject: string; kind: string; status: keyof typeof TONE; created_at: string; customers: { name: string } | null; orders: { number: number } | null };

export default async function VentasReclamosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireRole(null, "/ventas/reclamos");
  const { estado = "abierto" } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("tickets").select("id, subject, kind, status, created_at, customers(name), orders(number)").order("created_at", { ascending: false }).limit(80);
  if (estado !== "todos") q = q.eq("status", estado);
  const { data } = await q.returns<Row[]>();
  const tabs = [["abierto", "Abiertos"], ["respondido", "Respondidos"], ["cerrado", "Cerrados"], ["todos", "Todos"]];
  return (
    <>
      <PageHeader title="Reclamos y consultas" description="Cada mensaje queda registrado con su respuesta. Los abiertos esperan una respuesta de Ventas." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/ventas/reclamos?estado=${k}`} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold leading-9", estado === k ? "bg-lama-ink text-white" : "bg-white hover:bg-lama-red-soft")}>{l}</Link>
        ))}
      </div>
      <Card>
        {(data ?? []).length === 0 ? <p className="p-6 text-sm text-lama-steel">No hay reclamos en este estado.</p> : (
          <ul className="divide-y divide-lama-line">
            {(data ?? []).map((t) => (
              <li key={t.id}>
                <Link href={`/ventas/reclamos/${t.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-lama-cloud/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.subject}</p>
                    <p className="text-xs text-lama-steel">{t.customers?.name} · {KIND[t.kind]}{t.orders ? ` · pedido #${t.orders.number}` : ""} · {formatDateTime(t.created_at)}</p>
                  </div>
                  <Badge tone={TONE[t.status]}>{t.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
