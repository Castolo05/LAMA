import { describe, expect, it } from "vitest";
import { haversineKm, interpolatePosition, pathLengthKm } from "./geo";

describe("haversineKm", () => {
  it("mide ~25 km entre Tandil y Gardey", () => {
    const d = haversineKm({ lat: -37.3217, lng: -59.1332 }, { lat: -37.2835, lng: -59.3655 });
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(22);
  });
  it("es cero para el mismo punto", () => {
    expect(haversineKm({ lat: -37, lng: -59 }, { lat: -37, lng: -59 })).toBe(0);
  });
});

describe("interpolatePosition", () => {
  const path = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 0, lng: 3 }];
  it("devuelve los extremos en 0 y 1", () => {
    expect(interpolatePosition(path, 0)).toEqual({ lat: 0, lng: 0 });
    expect(interpolatePosition(path, 1)).toEqual({ lat: 0, lng: 3 });
  });
  it("avanza proporcional a la distancia recorrida", () => {
    const mid = interpolatePosition(path, 0.5);
    expect(mid.lng).toBeCloseTo(1.5, 2);
  });
  it("tolera un camino de un solo punto", () => {
    expect(interpolatePosition([{ lat: 1, lng: 2 }], 0.7)).toEqual({ lat: 1, lng: 2 });
  });
});

describe("pathLengthKm", () => {
  it("suma los tramos", () => {
    const a = { lat: -37.3, lng: -59.1 }, b = { lat: -37.31, lng: -59.1 };
    expect(pathLengthKm([a, b, a])).toBeCloseTo(2 * haversineKm(a, b), 6);
  });
});
