import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDeliveryDay, nextDeliveryDate } from "@/lib/delivery";
import type { PlanOrder, PlanTruck } from "@/lib/routing";
import { PageHeader } from "@/components/ui/PageHeader";
import { Planner } from "./Planner";

export const metadata = { title: "Planificador de rutas" };

type O = {
  id: string; number: number;
  customers: { name: string; lat: number; lng: number; zone: string; is_satellite: boolean } | null;
  order_items: { qty: number; qty_prepared: number | null; products: { weight_kg: number; volume_m3: number; needs_cold: boolean } | null }[];
};

export default async function PlanificadorPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await requireRole(["logistica", "admin"], "/logistica/planificador");
  const { fecha } = await searchParams;
  const supabase = await createClient();
  const { data: dates } = await supabase.from("orders").select("delivery_date").eq("status", "preparado").is("route_id", null).order("delivery_date");
  const available = [...new Set((dates ?? []).map((d) => d.delivery_date))];
  const date = fecha ?? available[0] ?? nextDeliveryDate(new Date());

  const [{ data: orders }, { data: trucks }, { data: drivers }, { data: busy }, { data: settings }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, customers(name, lat, lng, zone, is_satellite), order_items(qty, qty_prepared, products(weight_kg, volume_m3, needs_cold))")
      .eq("status", "preparado")
      .is("route_id", null)
      .eq("delivery_date", date)
      .returns<O[]>(),
    supabase.from("trucks").select("id, name, capacity_kg, capacity_m3, refrigerated, status").order("name"),
    supabase.from("drivers").select("id, full_name, truck_id").order("full_name"),
    supabase.from("routes").select("truck_id").eq("date", date),
    supabase.from("settings").select("key, value"),
  ]);
  const busyTrucks = new Set((busy ?? []).map((b) => b.truck_id));
  const s = Object.fromEntries((settings ?? []).map((x) => [x.key, Number(x.value)]));

  const planOrders: PlanOrder[] = (orders ?? []).map((o) => ({
    id: o.id,
    customerName: `${o.customers?.name ?? ""} (#${o.number})`,
    lat: o.customers?.lat ?? 0,
    lng: o.customers?.lng ?? 0,
    zone: o.customers?.zone ?? "barrios",
    isSatellite: !!o.customers?.is_satellite,
    weightKg: o.order_items.reduce((a, i) => a + (i.qty_prepared ?? i.qty) * Number(i.products?.weight_kg ?? 0), 0),
    volumeM3: o.order_items.reduce((a, i) => a + (i.qty_prepared ?? i.qty) * Number(i.products?.volume_m3 ?? 0), 0),
    needsCold: o.order_items.some((i) => i.products?.needs_cold),
  }));
  const planTrucks: PlanTruck[] = (trucks ?? [])
    .filter((t) => t.status === "operativo" && !busyTrucks.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, capacityKg: Number(t.capacity_kg), capacityM3: Number(t.capacity_m3), refrigerated: t.refrigerated }));

  return (
    <>
      <PageHeader
        title="Planificador de rutas"
        description={`Reparto del ${formatDeliveryDay(date)}. ${planTrucks.length} camiones disponibles.`}
        actions={
          available.length > 1 && (
            <form className="flex gap-2">
              <select name="fecha" defaultValue={date} className="h-10 rounded-[10px] border border-lama-line bg-white px-3 text-sm">
                {available.map((d) => <option key={d} value={d}>{formatDeliveryDay(d)}</option>)}
              </select>
              <button className="h-10 rounded-[10px] bg-lama-ink px-4 text-sm font-semibold text-white">Ver</button>
            </form>
          )
        }
      />
      <Planner key={date} date={date} orders={planOrders} trucks={planTrucks} drivers={drivers ?? []} settings={{ costPerKm: s.cost_per_km ?? 1450, driverDayCost: s.driver_day_cost ?? 85000, satelliteMinKg: s.satellite_min_kg ?? 350 }} />
    </>
  );
}
