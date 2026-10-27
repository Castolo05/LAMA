import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayBA } from "@/lib/delivery";
import { formatARS, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Table } from "@/components/ui/Table";
import { PaymentForm } from "./PaymentForm";

export const metadata = { title: "Cobranzas" };

type B = { customer_id: string; name: string; payment_terms_days: number; corriente: number; d1_30: number; d31_60: number; d60_mas: number; total: number; last_payment: string | null };

export default async function CobranzasPage() {
  const { profile } = await requireRole(null, "/cobranzas");
  const supabase = await createClient();
  const { data } = await supabase.rpc("customer_balances");
  const rows = ((data ?? []) as B[]).map((r) => ({ ...r, vencido: Number(r.d1_30) + Number(r.d31_60) + Number(r.d60_mas) })).sort((a, b) => b.vencido - a.vencido || Number(b.total) - Number(a.total));
  const sum = (k: keyof B | "vencido") => rows.reduce((s, r) => s + Number((r as Record<string, unknown>)[k] ?? 0), 0);
  const canRegister = ["ventas", "admin"].includes(profile.role);
  return (
    <>
      <PageHeader title="Cobranzas" description="Saldo de cada comercio por antigüedad de vencimiento. Los pagos se aplican a las facturas más viejas primero." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cartera total" value={formatARS(sum("total"))} />
        <Stat label="A vencer" value={formatARS(sum("corriente"))} />
        <Stat label="Vencido 1 a 30 días" value={formatARS(sum("d1_30"))} />
        <Stat label="Vencido más de 30 días" value={formatARS(sum("d31_60") + sum("d60_mas"))} tone="red" delta={`${rows.filter((r) => Number(r.d31_60) + Number(r.d60_mas) > 0).length} comercios`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Saldos por cliente" />
          <Table>
            <thead><tr><th>Comercio</th><th className="text-right">A vencer</th><th className="text-right">1–30</th><th className="text-right">31–60</th><th className="text-right">+60</th><th className="text-right">Total</th><th>Último pago</th></tr></thead>
            <tbody>
              {rows.filter((r) => Number(r.total) > 0).map((r) => (
                <tr key={r.customer_id}>
                  <td><p className="font-medium">{r.name}</p><p className="text-xs text-lama-steel">Plazo {r.payment_terms_days} días</p></td>
                  <td className="text-right tabular-nums whitespace-nowrap">{formatARS(Number(r.corriente))}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{Number(r.d1_30) ? formatARS(Number(r.d1_30)) : "—"}</td>
                  <td className="text-right tabular-nums whitespace-nowrap text-warn">{Number(r.d31_60) ? formatARS(Number(r.d31_60)) : "—"}</td>
                  <td className="text-right tabular-nums whitespace-nowrap font-semibold text-lama-red">{Number(r.d60_mas) ? formatARS(Number(r.d60_mas)) : "—"}</td>
                  <td className="text-right tabular-nums whitespace-nowrap font-semibold">{formatARS(Number(r.total))}</td>
                  <td className="whitespace-nowrap text-lama-steel">{r.last_payment ? formatDate(r.last_payment) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        {canRegister && (
          <Card className="xl:sticky xl:top-6 xl:self-start">
            <CardHeader title="Registrar pago" />
            <div className="p-5"><PaymentForm customers={rows.map((r) => ({ id: r.customer_id, name: r.name, total: Number(r.total) }))} today={todayBA()} /></div>
          </Card>
        )}
      </div>
    </>
  );
}
