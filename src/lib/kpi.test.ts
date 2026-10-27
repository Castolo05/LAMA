import { describe, expect, it } from "vitest";
import { costPerBulto, otif, pctChange } from "./kpi";

describe("otif", () => {
  it("cuenta las entregas a tiempo y completas", () => {
    expect(otif([{ on_time: true, in_full: true }, { on_time: true, in_full: true }, { on_time: true, in_full: true }, { on_time: false, in_full: true }])).toBe(0.75);
  });
  it("devuelve 0 sin entregas", () => {
    expect(otif([])).toBe(0);
  });
});

describe("costPerBulto", () => {
  it("divide el costo de rutas por los bultos", () => {
    expect(costPerBulto(1000, 40)).toBe(25);
  });
  it("no divide por cero", () => {
    expect(costPerBulto(1000, 0)).toBe(0);
  });
});

describe("pctChange", () => {
  it("calcula la variación relativa", () => {
    expect(pctChange(120, 100)).toBeCloseTo(0.2);
    expect(pctChange(5, 0)).toBe(0);
  });
});
