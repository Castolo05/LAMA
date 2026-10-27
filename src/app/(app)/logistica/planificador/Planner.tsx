"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Route as RouteIcon, Snowflake } from "lucide-react";
import { planRoutes, recomputeRoute, type Plan, type PlanOrder, type PlanTruck } from "@/lib/routing";
import { DEPOT } from "@/lib/geo";
import { formatARS, formatNumber, formatTime } from "@/lib/format";
import { confirmRoutes } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { ROUTE_COLORS } from "@/components/maps/PlanMap";

const PlanMap = dynamic(() => import("@/components/maps/PlanMap"), { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-lama-cloud lg:h-[560px]" /> });

type Driver = { id: string; full_name: string; truck_id: string | null };
type Settings = { costPerKm: number; driverDayCost: number; satelliteMinKg: number };

export function Planner({ date, orders, trucks, drivers, settings }: { date: string; orders: PlanOrder[]; trucks: PlanTruck[]; drivers: Driver[]; settings: Settings }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const truckName = (id: string) => trucks.find((t) => t.id === id)?.name ?? id;
  const driverOf = (truckId: string) => drivers.find((d) => d.truck_id === truckId)?.id ?? null;

  function generate() {
    const p = planRoutes({ orders, trucks, drivers, depot: DEPOT, date, settings });
    p.routes = p.routes.map((r) => ({ ...r, driverId: driverOf(r.truckId) ?? r.driverId }));
    setPlan(p);
  }

  function move(ri: number, si: number, dir: -1 | 1) {
    if (!plan) return;
    const r = plan.routes[ri];
    const stops = [...r.stops];
    const j = si + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[si], stops[j]] = [stops[j], stops[si]];
    const routes = [...plan.routes];
    routes[ri] = recomputeRoute({ ...r, stops }, byId, DEPOT, date, settings);
    setPlan({ ...plan, routes, totals: { ...plan.totals, km: Math.round(routes.reduce((s, x) => s + x.km, 0) * 10) / 10, cost: routes.reduce((s, x) => s + x.cost, 0) } });
  }

  function setDriver(ri: number, driverId: string) {
    if (!plan) return;
    const routes = [...plan.routes];
    routes[ri] = { ...routes[ri], driverId };
    setPlan({ ...plan, routes });
  }

  function confirm() {
    if (!plan) return;
    setError(null);
    start(async () => {
      const r = await confirmRoutes(date, plan.routes.map((x) => ({ truck_id: x.truckId, driver_id: x.driverId ?? "", km: x.km, cost: x.cost, stops: x.stops.map((s) => ({ order_id: s.orderId, seq: s.seq, eta: s.eta })) })));
      if (!r.ok) return setError(r.error);
      router.push(`/logistica/rutas?fecha=${date}&nuevas=${r.data}`);
    });
  }

  const totalKg = orders.reduce((s, o) => s + o.weightKg, 0);
  const naive = orders.length ? Math.round(orders.reduce((s, o) => s + 2 * Math.hypot((o.lat - DEPOT.lat) * 111, (o.lng - DEPOT.lng) * 88) * 1.3, 0)) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pedidos preparados" value={String(orders.length)} delta={`${orders.filter((o) => o.needsCold).length} con frío · ${orders.filter((o) => o.isSatellite).length} en localidades`} />
        <Stat label="Carga total" value={`${formatNumber(totalKg)} kg`} />
        <Stat label="Kilómetros planificados" value={plan ? `${formatNumber(plan.totals.km, 1)} km` : "—"} delta={plan && naive ? `vs ~${formatNumber(naive)} km yendo pedido por pedido` : undefined} tone="ok" />
        <Stat label="Costo estimado" value={plan ? formatARS(plan.totals.cost) : "—"} delta={plan ? `${formatARS(plan.totals.cost / Math.max(1, plan.totals.orders))} por pedido` : undefined} />
      </div>

      {!plan ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-lama-line bg-white p-6">
          <p className="max-w-2xl text-sm text-lama-steel">
            El planificador separa la carga refrigerada, llena cada camión según su capacidad de peso y volumen, visita primero el centro por la ventana de descarga y agrupa las localidades solo cuando la carga justifica el viaje.
          </p>
          <Button onClick={generate} disabled={orders.length === 0}><RouteIcon className="h-4 w-4" /> Generar rutas</Button>
          {orders.length === 0 && <p className="text-sm text-lama-steel">No hay pedidos preparados sin ruta para esta fecha.</p>}
        </div>
      ) : (
        <>
          <PlanMap
            routes={plan.routes.map((r, i) => ({ color: ROUTE_COLORS[i % ROUTE_COLORS.length], label: truckName(r.truckId), points: r.stops.map((s) => ({ ...byId.get(s.orderId)!, name: byId.get(s.orderId)!.customerName, seq: s.seq })) }))}
            loose={[...plan.deferred, ...plan.unassigned].map((d) => ({ ...byId.get(d.orderId)!, name: byId.get(d.orderId)!.customerName }))}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {plan.routes.map((r, ri) => {
              const t = trucks.find((x) => x.id === r.truckId)!;
              return (
                <section key={r.truckId} className="rounded-xl border border-lama-line bg-white">
                  <header className="flex flex-wrap items-center gap-3 border-b border-lama-line px-4 py-3">
                    <span className="h-4 w-4 -skew-x-12 rounded-sm" style={{ background: ROUTE_COLORS[ri % ROUTE_COLORS.length] }} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-display font-bold">{t.name}{t.refrigerated && <Snowflake className="h-4 w-4 text-lama-steel" aria-label="Refrigerado" />}</p>
                      <p className="text-xs text-lama-steel">
                        {r.stops.length} paradas · {formatNumber(r.km, 1)} km · {formatARS(r.cost)} · carga {Math.round((r.loadKg / t.capacityKg) * 100)} % ({formatNumber(r.loadKg)} de {formatNumber(t.capacityKg)} kg)
                      </p>
                    </div>
                    <label className="text-xs">
                      <span className="sr-only">Chofer</span>
                      <select value={r.driverId ?? ""} onChange={(e) => setDriver(ri, e.target.value)} className="h-9 rounded-lg border border-lama-line px-2 text-sm">
                        <option value="">Elegir chofer</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                      </select>
                    </label>
                  </header>
                  <ol className="divide-y divide-lama-line text-sm">
                    {r.stops.map((s, si) => {
                      const o = byId.get(s.orderId)!;
                      return (
                        <li key={s.orderId} className="flex items-center gap-3 px-4 py-2">
                          <span className="w-6 text-center font-display font-bold">{s.seq}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{o.customerName}</p>
                            <p className="text-xs text-lama-steel">{o.zone.charAt(0).toUpperCase() + o.zone.slice(1)} · {formatNumber(o.weightKg)} kg{o.needsCold ? " · frío" : ""}</p>
                          </div>
                          <span className="tabular-nums text-lama-steel">{formatTime(s.eta)}</span>
                          <div className="flex">
                            <button aria-label="Subir parada" onClick={() => move(ri, si, -1)} disabled={si === 0} className="rounded p-1.5 hover:bg-lama-cloud disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                            <button aria-label="Bajar parada" onClick={() => move(ri, si, 1)} disabled={si === r.stops.length - 1} className="rounded p-1.5 hover:bg-lama-cloud disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
          {(plan.deferred.length > 0 || plan.unassigned.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {plan.deferred.length > 0 && (
                <section className="rounded-xl bg-warn-soft p-4">
                  <h3 className="font-display font-bold text-warn">Postergados para la próxima salida</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {plan.deferred.map((d) => <li key={d.orderId}><strong>{byId.get(d.orderId)?.customerName}</strong> — {d.reason}. Ahorro estimado {formatARS(d.savingArs)}.</li>)}
                  </ul>
                </section>
              )}
              {plan.unassigned.length > 0 && (
                <section className="rounded-xl bg-lama-red-soft p-4">
                  <h3 className="font-display font-bold text-lama-red-dark">Sin asignar</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {plan.unassigned.map((d) => <li key={d.orderId}><strong>{byId.get(d.orderId)?.customerName}</strong> — {d.reason}.</li>)}
                  </ul>
                </section>
              )}
            </div>
          )}
          {error && <p className="text-sm text-lama-red">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={confirm} disabled={pending || plan.routes.length === 0}>{pending ? "Confirmando…" : `Confirmar ${plan.routes.length} rutas`}</Button>
            <Button size="lg" variant="dark" onClick={generate} disabled={pending}>Volver a calcular</Button>
          </div>
        </>
      )}
    </div>
  );
}
