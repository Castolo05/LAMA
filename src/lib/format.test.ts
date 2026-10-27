import { describe, expect, it } from "vitest";
import { formatARS, formatDate } from "./format";

describe("formatARS", () => {
  it("formatea pesos con separador de miles y decimales", () => {
    expect(formatARS(1234.5)).toBe("$ 1.234,50");
  });
});

describe("formatDate", () => {
  it("formatea fechas ISO como dd/mm/aaaa", () => {
    expect(formatDate("2026-10-27")).toBe("27/10/2026");
  });
});
