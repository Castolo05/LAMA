import { describe, expect, it } from "vitest";
import { planRoutes, type PlanOrder, type PlanTruck } from "./routing";
import { DEPOT } from "./geo";

const settings = { costPerKm: 1450, driverDayCost: 85000, satelliteMinKg: 300 };
const trucks: PlanTruck[] = [
  { id: "frio", name: "Camión frío", capacityKg: 6000, capacityM3: 30, refrigerated: true },
  { id: "seco", name: "Camión seco", capacityKg: 6000, capacityM3: 30, refrigerated: false },
];
const drivers = [{ id: "d1" }, { id: "d2" }];
const o = (id: string, p: Partial<PlanOrder> = {}): PlanOrder => ({
  id, customerName: id, lat: -37.32, lng: -59.13, zone: "barrios", isSatellite: false, weightKg: 100, volumeM3: 1, needsCold: false, ...p,
});
const run = (orders: PlanOrder[], t = trucks) => planRoutes({ orders, trucks: t, drivers, depot: DEPOT, date: "2026-10-28", settings });

describe("planRoutes", () => {
  it("nunca asigna un pedido con frío a un camión sin frío", () => {
    const plan = run([o("a", { needsCold: true }), o("b"), o("c", { needsCold: true })]);
    const seco = plan.routes.find((r) => r.truckId === "seco");
    expect(seco?.stops.map((s) => s.orderId) ?? []).not.toContain("a");
    expect(seco?.stops.map((s) => s.orderId) ?? []).not.toContain("c");
  });

  it("deja sin asignar lo que necesita frío cuando no hay capacidad refrigerada", () => {
    const plan = run([o("a", { needsCold: true })], [trucks[1]]);
    expect(plan.unassigned).toEqual([{ orderId: "a", reason: "Sin capacidad refrigerada" }]);
  });

  it("deja sin asignar un pedido más pesado que cualquier camión", () => {
    const plan = run([o("big", { weightKg: 9000 })]);
    expect(plan.unassigned).toEqual([{ orderId: "big", reason: "Excede capacidad de los camiones" }]);
  });

  it("no supera la capacidad de ningún camión", () => {
    const orders = Array.from({ length: 30 }, (_, i) => o(`o${i}`, { weightKg: 500 }));
    const plan = run(orders);
    for (const r of plan.routes) {
      const t = trucks.find((x) => x.id === r.truckId)!;
      expect(r.loadKg).toBeLessThanOrEqual(t.capacityKg);
    }
  });

  it("visita primero las paradas del centro", () => {
    const plan = run([
      o("barrio", { lat: -37.30, lng: -59.15, zone: "barrios" }),
      o("centro", { lat: -37.325, lng: -59.135, zone: "centro" }),
    ]);
    const stops = plan.routes.flatMap((r) => r.stops).sort((a, b) => a.seq - b.seq);
    expect(stops[0].orderId).toBe("centro");
  });

  it("posterga una localidad satélite con poca carga e informa el ahorro", () => {
    const plan = run([o("gardey", { lat: -37.2835, lng: -59.3655, zone: "Gardey", isSatellite: true, weightKg: 50 })]);
    expect(plan.deferred).toHaveLength(1);
    expect(plan.deferred[0].orderId).toBe("gardey");
    expect(plan.deferred[0].savingArs).toBeGreaterThan(0);
  });

  it("no pierde ningún pedido", () => {
    const orders = [
      ...Array.from({ length: 20 }, (_, i) => o(`n${i}`, { weightKg: 400, needsCold: i % 3 === 0 })),
      o("sat", { zone: "Barker", isSatellite: true, weightKg: 20, lat: -37.638, lng: -59.388 }),
      o("big", { weightKg: 99999 }),
    ];
    const plan = run(orders);
    const n = plan.routes.reduce((s, r) => s + r.stops.length, 0) + plan.deferred.length + plan.unassigned.length;
    expect(n).toBe(orders.length);
  });

  it("respeta el máximo de paradas por camión de la jornada", () => {
    const orders = Array.from({ length: 15 }, (_, i) => o(`p${i}`, { weightKg: 20 }));
    const plan = planRoutes({ orders, trucks, drivers, depot: DEPOT, date: "2026-10-28", settings: { ...settings, maxStops: 10 } });
    for (const r of plan.routes) expect(r.stops.length).toBeLessThanOrEqual(10);
    expect(plan.routes.reduce((s, r) => s + r.stops.length, 0)).toBe(15);
  });

  it("calcula km y costo de cada ruta", () => {
    const plan = run([o("a", { lat: -37.30, lng: -59.10 })]);
    const r = plan.routes[0];
    expect(r.km).toBeGreaterThan(0);
    expect(r.cost).toBeCloseTo(r.km * 1450 + 85000, 0);
    expect(r.stops[0].eta).toMatch(/^2026-10-28T/);
  });
});
