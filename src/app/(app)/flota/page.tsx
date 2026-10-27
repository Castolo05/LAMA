import { Snowflake, Wrench } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayBA } from "@/lib/delivery";
import { formatNumber } from "@/lib/format";
import { DEPOT } from "@/lib/geo";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import FleetMap from "./FleetMapClient";
import { ResolveButton } from "./ResolveButton";

export const metadata = { title: "Flota" };

type T = { id: string; name: string; plate: string; capacity_kg: number; refrigerated: boolean; odometer_km: number; drivers: { full_name: string }[] };
type Stop = { seq: number; orders: { customers: { lat: number; lng: number } | null } | null };

export default async function FlotaPage() {
  const { profile } = await requireRole(null, "/flota");
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: trucks }, { data: events }, { data: alerts }, { data: routes }] = await Promise.all([
    supabase.from("trucks").select("id, name, plate, capacity_kg, refrigerated, odometer_km, drivers(full_name)").order("name").returns<T[]>(),
    supabase.from("telemetry_events").select("truck_id, kind, value").gte("ts", since).limit(2000),
    supabase.from("maintenance_alerts").select("id, truck_id, severity, message, due_in_days, resolved").eq("resolved", false).order("due_in_days"),
    supabase.from("routes").select("truck_id, status, route_stops(seq, orders(customers(lat, lng)))").eq("date", todayBA()).eq("status", "en_curso"),
  ]);
  const stats = new Map<string, { idle: number; brakes: number; speed: number }>();
  for (const e of events ?? []) {
    const s = stats.get(e.truck_id) ?? { idle: 0, brakes: 0, speed: 0 };
    if (e.kind === "ralenti") s.idle += Number(e.value);
    if (e.kind === "frenada_brusca") s.brakes += 1;
    if (e.kind === "exceso_velocidad") s.speed += 1;
    stats.set(e.truck_id, s);
  }
  const fleetAvgBrakes = [...stats.values()].reduce((a, s) => a + s.brakes, 0) / Math.max(1, stats.size);
  const paths = new Map<string, { lat: number; lng: number }[]>();
  for (const r of routes ?? []) {
    const stops = ((r.route_stops ?? []) as unknown as Stop[]).sort((a, b) => a.seq - b.seq).map((s) => s.orders?.customers).filter((c): c is { lat: number; lng: number } => !!c);
    paths.set(r.truck_id, [DEPOT, ...stops, DEPOT]);
  }
  const canResolve = ["logistica", "admin"].includes(profile.role);

  return (
    <>
      <PageHeader title="Flota y telemetría" description="Estado de los camiones, hábitos de conducción de los últimos 30 días y alertas de mantenimiento antes de que un camión quede parado." />
      <p className="mb-4 rounded-lg bg-lama-cloud px-4 py-2.5 text-sm text-lama-steel">Datos de telemetría simulados para la demostración: en producción llegan del proveedor de GPS de cada camión.</p>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <CardHeader title="Flota en este momento" action={<span className="text-sm text-lama-steel">{paths.size} en reparto · {(trucks ?? []).length - paths.size} en depósito</span>} />
          <FleetMap trucks={(trucks ?? []).map((t) => ({ id: t.id, name: t.name, path: paths.get(t.id) ?? [DEPOT], moving: paths.has(t.id) }))} />
        </Card>
        <Card>
          <CardHeader title="Alertas de mantenimiento" />
          {(alerts ?? []).length === 0 ? <p className="p-5 text-sm text-lama-steel">No hay alertas abiertas.</p> : (
            <ul className="divide-y divide-lama-line">
              {(alerts ?? []).map((a) => (
                <li key={a.id} className="space-y-2 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-lama-red" />
                    <span className="font-semibold">{(trucks ?? []).find((t) => t.id === a.truck_id)?.name.split(" · ")[0]}</span>
                    <Badge tone={a.severity === "alta" ? "red" : a.severity === "media" ? "warn" : "neutral"}>Prioridad {a.severity}</Badge>
                  </div>
                  <p className="text-sm">{a.message}</p>
                  <div className="flex items-center justify-between text-xs text-lama-steel">
                    <span>Revisar en {a.due_in_days} días</span>
                    {canResolve && <ResolveButton id={a.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(trucks ?? []).map((t) => {
          const s = stats.get(t.id) ?? { idle: 0, brakes: 0, speed: 0 };
          const hot = s.brakes > fleetAvgBrakes * 1.8;
          return (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 font-display font-bold">{t.name}{t.refrigerated && <Snowflake className="h-4 w-4 text-lama-steel" aria-label="Refrigerado" />}</p>
                  <p className="text-xs text-lama-steel">{t.plate} · {t.drivers[0]?.full_name ?? "Sin chofer"} · {formatNumber(Number(t.capacity_kg))} kg</p>
                </div>
                <Badge tone={paths.has(t.id) ? "red" : "neutral"}>{paths.has(t.id) ? "En reparto" : "En depósito"}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-lama-cloud py-2"><dt className="text-[11px] text-lama-steel">Ralentí</dt><dd className="font-display font-bold tabular-nums">{formatNumber(s.idle / 60, 1)} h</dd></div>
                <div className={hot ? "rounded-lg bg-lama-red-soft py-2" : "rounded-lg bg-lama-cloud py-2"}><dt className="text-[11px] text-lama-steel">Frenadas bruscas</dt><dd className={hot ? "font-display font-bold tabular-nums text-lama-red" : "font-display font-bold tabular-nums"}>{s.brakes}</dd></div>
                <div className="rounded-lg bg-lama-cloud py-2"><dt className="text-[11px] text-lama-steel">Excesos</dt><dd className="font-display font-bold tabular-nums">{s.speed}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-lama-steel">Odómetro {formatNumber(Number(t.odometer_km))} km</p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
