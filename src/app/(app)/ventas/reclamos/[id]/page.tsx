import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TicketThread, type Msg } from "@/components/tickets/TicketThread";
import { ReplyBox } from "@/components/tickets/ReplyBox";

const TONE = { abierto: "red", respondido: "ok", cerrado: "neutral" } as const;

export default async function VentasReclamoPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole(null, "/ventas/reclamos");
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("tickets").select("id, subject, status, customers(name, phone), orders(id, number)").eq("id", id).single();
  if (!t) notFound();
  const { data: msgs } = await supabase.from("ticket_messages").select("id, body, created_at, author_id, profiles(full_name, role)").eq("ticket_id", id).order("created_at").returns<Msg[]>();
  const c = t.customers as unknown as { name: string; phone: string | null } | null;
  const o = t.orders as unknown as { id: string; number: number } | null;
  const canReply = ["ventas", "admin"].includes(profile.role);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/ventas/reclamos" className="text-sm text-lama-steel hover:text-lama-red">← Reclamos</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="energetic text-2xl">{t.subject}</h1>
        <Badge tone={TONE[t.status as keyof typeof TONE]}>{t.status}</Badge>
      </div>
      <p className="text-sm text-lama-steel">{c?.name}{c?.phone ? ` · ${c.phone}` : ""}{o && <> · <Link href={`/pedidos/${o.id}`} className="font-semibold text-lama-red">pedido #{o.number}</Link></>}</p>
      <Card className="space-y-6 p-5">
        <TicketThread messages={msgs ?? []} viewerId={profile.id} />
        {canReply && <ReplyBox ticketId={t.id} staff />}
      </Card>
    </div>
  );
}
