import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demo";

const ROLES = ["admin", "direccion", "ventas", "preventista", "logistica", "deposito", "chofer", "cobranzas", "cliente", "proveedor"];

describe("DEMO_ACCOUNTS", () => {
  it("cubre los 10 roles con un email de demo cada uno", () => {
    for (const role of ROLES) {
      const acc = DEMO_ACCOUNTS.find((a) => a.role === role);
      expect(acc, role).toBeDefined();
      expect(acc!.email).toMatch(/@demo\.lama\.com\.ar$/);
    }
  });
  it("incluye un segundo cliente para mostrar el aislamiento de datos", () => {
    expect(DEMO_ACCOUNTS.filter((a) => a.role === "cliente")).toHaveLength(2);
  });
  it("usa una contraseña de demo de al menos 8 caracteres", () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });
});
