import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { agingBuckets } from "@/lib/aging";
import { todayBA } from "@/lib/delivery";
import { formatARS, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Estado de cuenta" };

export default async function CuentaPage() {
  const { customer } = await requireRole(["cliente"], "/cuenta");
  const supabase = await createClient();
  const today = todayBA();
  const [{ data: invoices }, { data: payments }, { data: cust }] = await Promise.all([
    supabase.from("invoices").select("id, number, amount, issued_on, due_on").order("issued_on", { ascending: true }),
    supabase.from("payments").select("id, amount, paid_on, method").order("paid_on", { ascending: false }),
    supabase.from("customers").select("payment_terms_days").eq("id", customer!.id).single(),
  ]);
  const inv = invoices ?? [];
  const pays = payments ?? [];
  const b = agingBuckets(inv, pays, today);

  // estado por factura (FIFO, igual que el saldo)
  let credit = pays.reduce((s, p) => s + Number(p.amount), 0);
  const rows = inv.map((i) => {
    const used = Math.min(Number(i.amount), credit);
    credit -= used;
    const open = Number(i.amount) - used;
    return { ...i, open, overdue: open > 0.005 && i.due_on < today };
  }).reverse();

  return (
    <>
      <PageHeader title="Estado de cuenta" description={`Plazo de pago acordado: ${cust?.payment_terms_days ?? 15} días desde la entrega.`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Saldo total" value={formatARS(b.total)} />
        <Stat label="A vencer" value={formatARS(b.corriente)} />
        <Stat label="Vencido" value={formatARS(b.vencido)} tone={b.vencido > 0 ? "red" : "ok"} delta={b.vencido > 0 ? "Comunicate con cobranzas para regularizar" : "Estás al día"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Facturas" />
          <Table>
            <thead><tr><th>Factura</th><th>Emitida</th><th>Vence</th><th>Estado</th><th className="text-right">Importe</th></tr></thead>
            <tbody>
              {rows.slice(0, 40).map((i) => (
                <tr key={i.id}>
                  <td className="font-medium whitespace-nowrap">{i.number}</td>
                  <td>{formatDate(i.issued_on)}</td>
                  <td>{formatDate(i.due_on)}</td>
                  <td>{i.open <= 0.005 ? <Badge tone="ok">Pagada</Badge> : i.overdue ? <Badge tone="red">Vencida</Badge> : <Badge>Pendiente</Badge>}</td>
                  <td className="text-right font-semibold tabular-nums whitespace-nowrap">{formatARS(Number(i.amount))}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Pagos recibidos" />
          <ul className="divide-y divide-lama-line">
            {pays.slice(0, 15).map((p) => (
              <li key={p.id} className="flex justify-between px-5 py-3 text-sm">
                <span><span className="block">{formatDate(p.paid_on)}</span><span className="text-xs capitalize text-lama-steel">{p.method}</span></span>
                <span className="font-semibold tabular-nums">{formatARS(Number(p.amount))}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
