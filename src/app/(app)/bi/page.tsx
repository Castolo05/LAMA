import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayBA } from "@/lib/delivery";
import { formatARS, formatNumber, formatPct } from "@/lib/format";
import { pctChange } from "@/lib/kpi";
import type { Role } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Table } from "@/components/ui/Table";
import { ChannelStack, KpiLine } from "@/components/charts/Charts";
import { CsvButton } from "@/components/charts/CsvButton";
import { cn } from "@/lib/cn";

export const metadata = { title: "Tableros" };

type K = { month: string; orders: number; delivered: number; otif: number; bultos: number; revenue: number; route_cost: number; cost_per_bulto: number; km: number; portal_share: number; telefono_share: number };
type CP = { customer_id: string; name: string; zone: string; orders: number; bultos: number; revenue: number; margin: number; logistic_cost: number; profit: number };
type RP = { truck: string; routes: number; km: number; cost: number; stops: number; otif: number; cost_per_stop: number };

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const label = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(2, 4)}`;

function show(role: Role, area: "ventas" | "operacion" | "cobranza") {
  if (role === "admin" || role === "direccion") return true;
  return ((area === "ventas" || area === "cobranza") && role === "ventas") || (area === "operacion" && role === "logistica");
}

export default async function BiPage({ searchParams }: { searchParams: Promise<{ meses?: string }> }) {
  const { profile } = await requireRole(null, "/bi");
  const role = profile.role;
  const { meses = "6" } = await searchParams;
  const months = [3, 6].includes(Number(meses)) ? Number(meses) : 6;
  const today = todayBA();
  const from = new Date(Date.parse(today) - months * 31 * 86_400_000).toISOString().slice(0, 10);
  const last30 = new Date(Date.parse(today) - 30 * 86_400_000).toISOString().slice(0, 10);
  const supabase = await createClient();

  const [kpi, prof, routes, balances] = await Promise.all([
    supabase.rpc("kpi_monthly", { p_from: from, p_to: today }),
    show(role, "ventas") ? supabase.rpc("customer_profitability", { p_from: last30, p_to: today }) : Promise.resolve({ data: [] }),
    show(role, "operacion") ? supabase.rpc("route_performance", { p_from: last30, p_to: today }) : Promise.resolve({ data: [] }),
    show(role, "cobranza") ? supabase.rpc("customer_balances") : Promise.resolve({ data: [] }),
  ]);
  const k = ((kpi.data ?? []) as K[]).filter((r) => r.delivered >= 50) // descarta meses incompletos en el borde del rango
   .map((r) => ({ ...r, label: label(r.month), otif: Number(r.otif), cost_per_bulto: Number(r.cost_per_bulto), portal_share: Number(r.portal_share), revenue: Number(r.revenue) }));
  const first = k[0], last = k[k.length - 1];
  const profitRows = ((prof.data ?? []) as CP[]).map((r) => ({ ...r, profit: Number(r.profit), revenue: Number(r.revenue), margin: Number(r.margin), logistic_cost: Number(r.logistic_cost) })).sort((a, b) => b.profit - a.profit);
  const routeRows = (routes.data ?? []) as RP[];
  const bal = (balances.data ?? []) as { total: number; d1_30: number; d31_60: number; d60_mas: number }[];
  const overdue = bal.reduce((s, b) => s + Number(b.d1_30) + Number(b.d31_60) + Number(b.d60_mas), 0);

  return (
    <>
      <PageHeader
        title="Tableros"
        description={`Indicadores de los últimos ${months} meses, calculados con cada pedido, ruta y entrega registrados en la plataforma.`}
        actions={
          <div className="flex gap-2">
            {[3, 6].map((m) => (
              <Link key={m} href={`/bi?meses=${m}`} className={cn("h-10 rounded-full px-4 text-sm font-semibold leading-10", m === months ? "bg-lama-ink text-white" : "bg-white hover:bg-lama-red-soft")}>{m} meses</Link>
            ))}
          </div>
        }
      />
      {first && last && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="OTIF (a tiempo y completo)" value={formatPct(last.otif)} delta={`${last.otif >= first.otif ? "+" : ""}${formatNumber((last.otif - first.otif) * 100, 1)} pts desde ${first.label}`} tone={last.otif >= first.otif ? "ok" : "red"} />
          <Stat label="Costo logístico por bulto" value={formatARS(last.cost_per_bulto)} delta={`${formatPct(pctChange(last.cost_per_bulto, first.cost_per_bulto))} desde ${first.label}`} tone={last.cost_per_bulto <= first.cost_per_bulto ? "ok" : "red"} />
          <Stat label="Pedidos por el portal" value={formatPct(last.portal_share, 0)} delta={`${formatPct(first.portal_share, 0)} en ${first.label}`} tone="ok" />
          {role === "ventas" ? (
            <Stat label="Deuda vencida" value={formatARS(overdue)} tone="red" />
          ) : (
            <Stat label={`Ventas ${last.label}`} value={formatARS(last.revenue)} delta={`${formatNumber(last.delivered)} pedidos entregados`} />
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {show(role, "operacion") || role === "ventas" ? (
          <Card>
            <CardHeader title="OTIF mensual" action={<CsvButton filename="otif-mensual.csv" rows={k.map((r) => ({ mes: r.label, pedidos_entregados: r.delivered, otif: r.otif }))} />} />
            <div className="p-4"><KpiLine data={k} dataKey="otif" label="OTIF" kind="pct" /></div>
          </Card>
        ) : null}
        {show(role, "operacion") && (
          <Card>
            <CardHeader title="Costo logístico por bulto" action={<CsvButton filename="costo-por-bulto.csv" rows={k.map((r) => ({ mes: r.label, bultos: r.bultos, costo_rutas: Number(r.route_cost), km: Number(r.km), costo_por_bulto: r.cost_per_bulto }))} />} />
            <div className="p-4"><KpiLine data={k} dataKey="cost_per_bulto" label="Costo por bulto" kind="ars" /></div>
          </Card>
        )}
        {show(role, "ventas") && (
          <Card>
            <CardHeader title="Pedidos por canal" action={<CsvButton filename="pedidos-por-canal.csv" rows={k.map((r) => ({ mes: r.label, portal: Number(r.portal_share), telefono: Number(r.telefono_share) }))} />} />
            <div className="p-4"><ChannelStack data={k.map((r) => ({ label: r.label, portal: r.portal_share, telefono: Number(r.telefono_share) }))} /></div>
          </Card>
        )}
        {show(role, "ventas") && (
          <Card>
            <CardHeader title="Ventas mensuales" />
            <div className="p-4"><KpiLine data={k} dataKey="revenue" label="Ventas" kind="millions" /></div>
          </Card>
        )}
      </div>

      {show(role, "ventas") && profitRows.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Rentabilidad por cliente · últimos 30 días" action={<CsvButton filename="rentabilidad-clientes.csv" rows={profitRows.map((r) => ({ cliente: r.name, zona: r.zone, pedidos: r.orders, bultos: r.bultos, ventas: r.revenue, margen_bruto: r.margin, costo_logistico: r.logistic_cost, resultado: r.profit }))} />} />
          <Table>
            <thead><tr><th>Cliente</th><th className="text-right">Ventas</th><th className="text-right">Margen</th><th className="text-right">Logística</th><th className="text-right">Resultado</th></tr></thead>
            <tbody>
              {[...profitRows.slice(0, 6), ...profitRows.slice(-4)].map((r, i) => (
                <tr key={r.customer_id} className={i === 6 ? "border-t-2 border-lama-ink" : ""}>
                  <td><p className="font-medium">{r.name}</p><p className="text-xs capitalize text-lama-steel">{r.zone}</p></td>
                  <td className="text-right tabular-nums whitespace-nowrap">{formatARS(r.revenue)}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">{formatARS(r.margin)}</td>
                  <td className="text-right tabular-nums whitespace-nowrap text-lama-steel">−{formatARS(r.logistic_cost)}</td>
                  <td className={cn("text-right font-semibold tabular-nums whitespace-nowrap", r.profit < 0 && "text-lama-red")}>{formatARS(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="px-4 py-3 text-xs text-lama-steel">Los 6 más rentables y los 4 menos rentables. El costo logístico asigna el costo por bulto del período (×2,2 en localidades de la región).</p>
        </Card>
      )}

      {show(role, "operacion") && routeRows.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Desempeño por camión · últimos 30 días" action={<CsvButton filename="desempeno-camiones.csv" rows={routeRows.map((r) => ({ camion: r.truck, rutas: r.routes, km: Number(r.km), costo: Number(r.cost), entregas: r.stops, otif: Number(r.otif), costo_por_entrega: Number(r.cost_per_stop) }))} />} />
          <Table>
            <thead><tr><th>Camión</th><th className="text-right">Rutas</th><th className="text-right">Entregas</th><th className="text-right">Km</th><th className="text-right">Costo por entrega</th><th className="text-right">OTIF</th></tr></thead>
            <tbody>
              {routeRows.map((r) => (
                <tr key={r.truck}><td className="font-medium">{r.truck}</td><td className="text-right tabular-nums">{r.routes}</td><td className="text-right tabular-nums">{r.stops}</td><td className="text-right tabular-nums">{formatNumber(Number(r.km))}</td><td className="text-right tabular-nums whitespace-nowrap">{formatARS(Number(r.cost_per_stop))}</td><td className="text-right tabular-nums">{formatPct(Number(r.otif))}</td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
