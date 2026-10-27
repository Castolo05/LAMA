import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NewTicketForm } from "./NewTicketForm";

export const metadata = { title: "Reclamos y contacto" };

const KIND: Record<string, string> = { rotura: "Rotura", faltante: "Faltante", demora: "Demora", consulta: "Consulta", otro: "Otro" };
const TICKET_TONE = { abierto: "red", respondido: "ok", cerrado: "neutral" } as const;
const TICKET_LABEL = { abierto: "Abierto", respondido: "Respondido", cerrado: "Cerrado" } as const;

export default async function ReclamosPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { profile } = await requireRole(["cliente"], "/reclamos");
  const { pedido } = await searchParams;
  const supabase = await createClient();
  const [{ data: tickets }, { data: orders }] = await Promise.all([
    supabase.from("tickets").select("id, kind, status, subject, created_at, orders(number)").order("created_at", { ascending: false }),
    supabase.from("orders").select("id, number, delivery_date").order("created_at", { ascending: false }).limit(15),
  ]);
  return (
    <>
      <PageHeader title="Reclamos y contacto" description="Escribinos por roturas, faltantes o cualquier consulta. Te responde una persona de Ventas." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader title="Nuevo reclamo o consulta" />
            <div className="p-5">
              <NewTicketForm
                customerId={profile.customer_id!}
                defaultOrder={pedido}
                orders={(orders ?? []).map((o) => ({ id: o.id, number: o.number, label: `#${o.number} · entrega ${formatDate(o.delivery_date)}` }))}
              />
            </div>
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Hablá con nosotros" />
            <div className="flex flex-col gap-2 p-5">
              <a href="tel:+542494451556" className="flex items-center gap-3 rounded-lg bg-lama-cloud px-4 py-3 font-semibold hover:bg-lama-red-soft"><Phone className="h-4 w-4 text-lama-red" /> Llamar al +54 249 445-1556</a>
              <a href="https://wa.me/542494451556" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg bg-lama-cloud px-4 py-3 font-semibold hover:bg-lama-red-soft"><MessageCircle className="h-4 w-4 text-lama-red" /> Escribir por WhatsApp</a>
              <p className="text-xs text-lama-steel">Lunes a sábado de 7 a 18 h.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Tus reclamos" />
            {(tickets ?? []).length === 0 ? (
              <p className="p-5 text-sm text-lama-steel">No tenés reclamos abiertos.</p>
            ) : (
              <ul className="divide-y divide-lama-line">
                {(tickets ?? []).map((t) => (
                  <li key={t.id}>
                    <Link href={`/reclamos/${t.id}`} className="block px-5 py-3 hover:bg-lama-cloud/60">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{t.subject}</p>
                        <Badge tone={TICKET_TONE[t.status as keyof typeof TICKET_TONE]}>{TICKET_LABEL[t.status as keyof typeof TICKET_LABEL]}</Badge>
                      </div>
                      <p className="text-xs text-lama-steel">{KIND[t.kind]}{(t.orders as unknown as { number: number } | null) ? ` · pedido #${(t.orders as unknown as { number: number }).number}` : ""} · {formatDateTime(t.created_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
