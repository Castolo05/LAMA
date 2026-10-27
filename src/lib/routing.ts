import { haversineKm, type LatLng } from "./geo";

export type PlanOrder = { id: string; customerName: string; lat: number; lng: number; zone: string; isSatellite: boolean; weightKg: number; volumeM3: number; needsCold: boolean };
export type PlanTruck = { id: string; name: string; capacityKg: number; capacityM3: number; refrigerated: boolean };
export type PlanStop = { orderId: string; seq: number; eta: string };
export type PlanRoute = { truckId: string; driverId: string | null; stops: PlanStop[]; km: number; cost: number; loadKg: number; loadM3: number };
export type Plan = {
  routes: PlanRoute[];
  deferred: { orderId: string; reason: string; savingArs: number }[];
  unassigned: { orderId: string; reason: string }[];
  totals: { km: number; cost: number; orders: number };
};
export type PlanInput = {
  orders: PlanOrder[];
  trucks: PlanTruck[];
  drivers: { id: string }[];
  depot: LatLng;
  date: string;
  settings: { costPerKm: number; driverDayCost: number; satelliteMinKg: number; maxStops?: number };
};

export const ROAD_FACTOR = 1.3; // de línea recta a recorrido real
const START = "07:30";
const URBAN_KMH = 25;
const ROAD_KMH = 60;
const MIN_PER_STOP = 8;
export const DEFAULT_MAX_STOPS = 10; // paradas que entran en una jornada de reparto

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Ordena paradas por vecino más cercano: primero el centro (ventana de descarga antes de las 10 h), después el resto. */
function orderStops(depot: LatLng, orders: PlanOrder[]): PlanOrder[] {
  const nearest = (from: LatLng, pool: PlanOrder[]) => {
    const out: PlanOrder[] = [];
    const rest = [...pool];
    let cur = from;
    while (rest.length) {
      let best = 0;
      for (let i = 1; i < rest.length; i++) if (haversineKm(cur, rest[i]) < haversineKm(cur, rest[best])) best = i;
      const [next] = rest.splice(best, 1);
      out.push(next);
      cur = next;
    }
    return out;
  };
  const centro = nearest(depot, orders.filter((o) => o.zone === "centro"));
  const last = centro.length ? centro[centro.length - 1] : depot;
  return [...centro, ...nearest(last, orders.filter((o) => o.zone !== "centro"))];
}

export function planRoutes(input: PlanInput): Plan {
  const { orders, trucks, drivers, depot, date, settings } = input;
  const deferred: Plan["deferred"] = [];
  const unassigned: Plan["unassigned"] = [];

  // 1. Localidades satélite: viajan solo si la carga justifica el viaje
  const pool: PlanOrder[] = orders.filter((o) => !o.isSatellite);
  const byTown = new Map<string, PlanOrder[]>();
  for (const o of orders.filter((x) => x.isSatellite)) byTown.set(o.zone, [...(byTown.get(o.zone) ?? []), o]);
  for (const list of byTown.values()) {
    const kg = list.reduce((s, o) => s + o.weightKg, 0);
    if (kg < settings.satelliteMinKg) {
      const c = { lat: list.reduce((s, o) => s + o.lat, 0) / list.length, lng: list.reduce((s, o) => s + o.lng, 0) / list.length };
      const saving = Math.round(2 * haversineKm(depot, c) * ROAD_FACTOR * settings.costPerKm);
      for (const o of list) deferred.push({ orderId: o.id, reason: `Poca carga para ${o.zone} (${Math.round(kg)} kg de ${settings.satelliteMinKg} kg mínimos)`, savingArs: Math.round(saving / list.length) });
    } else pool.push(...list);
  }

  // 2 y 3. Asignación first-fit decreasing por peso, respetando frío, kg y m³
  const maxKg = Math.max(0, ...trucks.map((t) => t.capacityKg));
  const maxStops = settings.maxStops ?? DEFAULT_MAX_STOPS;
  const load = new Map(trucks.map((t) => [t.id, { kg: 0, m3: 0, orders: [] as PlanOrder[] }]));
  const dryFirst = [...trucks.filter((t) => !t.refrigerated), ...trucks.filter((t) => t.refrigerated)];
  for (const o of [...pool].sort((a, b) => b.weightKg - a.weightKg)) {
    if (o.weightKg > maxKg) {
      unassigned.push({ orderId: o.id, reason: "Excede capacidad de los camiones" });
      continue;
    }
    const candidates = o.needsCold ? trucks.filter((t) => t.refrigerated) : dryFirst;
    const t = candidates.find((c) => {
      const l = load.get(c.id)!;
      return l.orders.length < maxStops && l.kg + o.weightKg <= c.capacityKg && l.m3 + o.volumeM3 <= c.capacityM3;
    });
    if (!t) {
      unassigned.push({ orderId: o.id, reason: o.needsCold ? "Sin capacidad refrigerada" : "Sin capacidad disponible" });
      continue;
    }
    const l = load.get(t.id)!;
    l.kg += o.weightKg;
    l.m3 += o.volumeM3;
    l.orders.push(o);
  }

  // 4 y 5. Recorrido, km, costo y horario estimado por camión
  const routes: PlanRoute[] = [];
  let driverIdx = 0;
  for (const t of trucks) {
    const l = load.get(t.id)!;
    if (l.orders.length === 0) continue;
    const byId = new Map(l.orders.map((o) => [o.id, o]));
    const draft: PlanRoute = {
      truckId: t.id,
      driverId: drivers[driverIdx++]?.id ?? null,
      stops: orderStops(depot, l.orders).map((o, i) => ({ orderId: o.id, seq: i + 1, eta: "" })),
      km: 0,
      cost: 0,
      loadKg: round1(l.kg),
      loadM3: Math.round(l.m3 * 100) / 100,
    };
    routes.push(recomputeRoute(draft, byId, depot, date, settings));
  }

  return {
    routes,
    deferred,
    unassigned,
    totals: { km: round1(routes.reduce((s, r) => s + r.km, 0)), cost: routes.reduce((s, r) => s + r.cost, 0), orders: routes.reduce((s, r) => s + r.stops.length, 0) },
  };
}

/** Recalcula km, costo y horarios de una ruta después de reordenar sus paradas a mano. */
export function recomputeRoute(route: PlanRoute, ordersById: Map<string, PlanOrder>, depot: LatLng, date: string, settings: PlanInput["settings"]): PlanRoute {
  const seq = route.stops.map((s) => ordersById.get(s.orderId)!).filter(Boolean);
  let km = 0, minutes = 0;
  let prev: PlanOrder | LatLng = depot;
  const start = new Date(`${date}T${START}:00-03:00`).getTime();
  const stops = seq.map((o, i) => {
    const legKm = haversineKm(prev, o) * ROAD_FACTOR;
    const satLeg = o.isSatellite || ("isSatellite" in prev && prev.isSatellite);
    km += legKm;
    minutes += (legKm / (satLeg ? ROAD_KMH : URBAN_KMH)) * 60 + (i > 0 ? MIN_PER_STOP : 0);
    prev = o;
    return { orderId: o.id, seq: i + 1, eta: new Date(start + minutes * 60_000).toISOString() };
  });
  km = round1(km + haversineKm(prev, depot) * ROAD_FACTOR);
  return { ...route, stops, km, cost: Math.round(km * settings.costPerKm + settings.driverDayCost) };
}
