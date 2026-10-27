import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayBA } from "@/lib/delivery";
import { formatARS, formatNumber, formatPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Table } from "@/components/ui/Table";
import { UnitsBar } from "@/components/charts/Charts";
import { CsvButton } from "@/components/charts/CsvButton";

export const metadata = { title: "Informes para proveedores" };

type Row = { month: string; product: string; zone: string; units: number; revenue: number; in_full_pct: number; stores_reached: number };
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function ProveedorPage() {
  await requireRole(["proveedor"], "/proveedor");
  const supabase = await createClient();
  const today = todayBA();
  const from = new Date(Date.parse(today) - 180 * 86_400_000).toISOString().slice(0, 10);
  const [{ data }, { data: sup }] = await Promise.all([
    supabase.rpc("supplier_report", { p_from: from, p_to: today }),
    supabase.from("suppliers").select("name").single(),
  ]);
  const rows = ((data ?? []) as Row[]).map((r) => ({ ...r, units: Number(r.units), revenue: Number(r.revenue), in_full_pct: Number(r.in_full_pct) }));

  const byMonth = new Map<string, number>();
  const byProduct = new Map<string, { units: number; revenue: number; inFull: number; n: number }>();
  const byZone = new Map<string, number>();
  for (const r of rows) {
    byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.units);
    const p = byProduct.get(r.product) ?? { units: 0, revenue: 0, inFull: 0, n: 0 };
    byProduct.set(r.product, { units: p.units + r.units, revenue: p.revenue + r.revenue, inFull: p.inFull + r.in_full_pct * r.units, n: p.n + r.units });
    byZone.set(r.zone, (byZone.get(r.zone) ?? 0) + r.units);
  }
  const monthly = [...byMonth.entries()].sort().map(([m, v]) => ({ label: `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`, value: v }));
  const totalUnits = rows.reduce((s, r) => s + r.units, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const inFull = totalUnits ? rows.reduce((s, r) => s + r.in_full_pct * r.units, 0) / totalUnits : 0;
  const lastMonth = [...byMonth.keys()].sort().pop();
  // las zonas no se superponen: la suma del máximo por zona es un mínimo de comercios distintos alcanzados
  const zoneMax = new Map<string, number>();
  for (const r of rows.filter((x) => x.month === lastMonth)) zoneMax.set(r.zone, Math.max(zoneMax.get(r.zone) ?? 0, Number(r.stores_reached)));
  const storesLastMonth = [...zoneMax.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Informes de distribución" description={`${sup?.name ?? "Proveedor"} · últimos 6 meses. Datos agregados de sus productos; no incluyen información individual de comercios ni de otros proveedores.`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Unidades distribuidas" value={formatNumber(totalUnits)} />
        <Stat label="Ventas a comercios" value={formatARS(totalRevenue)} />
        <Stat label="Entregas completas" value={formatPct(inFull)} delta="Líneas entregadas sin faltantes" tone="ok" />
        <Stat label="Comercios alcanzados" value={`${storesLastMonth}+`} delta="Comercios distintos, último mes" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Unidades por mes" />
          <div className="p-4"><UnitsBar data={monthly} /></div>
        </Card>
        <Card>
          <CardHeader title="Cobertura por zona" />
          <ul className="space-y-4 p-5">
            {[...byZone.entries()].sort((a, b) => b[1] - a[1]).map(([z, u]) => (
              <li key={z}>
                <div className="flex justify-between text-sm"><span className="font-medium">{z}</span><span className="tabular-nums">{formatNumber(u)} u. · {formatPct(u / totalUnits, 0)}</span></div>
                <div className="mt-1.5 h-2 rounded-full bg-lama-cloud"><div className="h-2 rounded-full bg-lama-red" style={{ width: `${(u / totalUnits) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Por producto" action={<CsvButton filename="informe-proveedor.csv" rows={rows.map((r) => ({ mes: r.month, producto: r.product, zona: r.zone, unidades: r.units, ventas: r.revenue, entregas_completas: r.in_full_pct, comercios: r.stores_reached }))} />} />
        <Table>
          <thead><tr><th>Producto</th><th className="text-right">Unidades</th><th className="text-right">Ventas</th><th className="text-right">Entregas completas</th></tr></thead>
          <tbody>
            {[...byProduct.entries()].sort((a, b) => b[1].units - a[1].units).map(([name, p]) => (
              <tr key={name}><td className="font-medium">{name}</td><td className="text-right tabular-nums">{formatNumber(p.units)}</td><td className="text-right tabular-nums whitespace-nowrap">{formatARS(p.revenue)}</td><td className="text-right tabular-nums">{formatPct(p.n ? p.inFull / p.n : 0)}</td></tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
