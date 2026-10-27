import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TicketThread, type Msg } from "@/components/tickets/TicketThread";
import { ReplyBox } from "@/components/tickets/ReplyBox";

const TONE = { abierto: "red", respondido: "ok", cerrado: "neutral" } as const;
const LABEL = { abierto: "Abierto", respondido: "Respondido", cerrado: "Cerrado" } as const;

export default async function ReclamoPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole(["cliente"], "/reclamos");
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("tickets").select("id, subject, status, kind, orders(id, number)").eq("id", id).single();
  if (!t) notFound();
  const { data: msgs } = await supabase.from("ticket_messages").select("id, body, created_at, author_id, profiles(full_name, role)").eq("ticket_id", id).order("created_at").returns<Msg[]>();
  const order = t.orders as unknown as { id: string; number: number } | null;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/reclamos" className="text-sm text-lama-steel hover:text-lama-red">← Reclamos</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="energetic text-2xl">{t.subject}</h1>
        <Badge tone={TONE[t.status as keyof typeof TONE]}>{LABEL[t.status as keyof typeof LABEL]}</Badge>
      </div>
      {order && <p className="text-sm text-lama-steel">Pedido <Link href={`/pedidos/${order.id}`} className="font-semibold text-lama-red">#{order.number}</Link></p>}
      <Card className="space-y-6 p-5">
        <TicketThread messages={msgs ?? []} viewerId={profile.id} />
        {t.status !== "cerrado" ? <ReplyBox ticketId={t.id} /> : <p className="text-sm text-lama-steel">Este reclamo está cerrado. Si necesitás algo más, abrí uno nuevo.</p>}
      </Card>
    </div>
  );
}
