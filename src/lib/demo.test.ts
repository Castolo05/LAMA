import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demo";

const ROLES = ["admin", "direccion", "ventas", "logistica", "chofer", "cliente", "proveedor"];

describe("DEMO_ACCOUNTS", () => {
  it("tiene exactamente una cuenta por rol, con email de demo", () => {
    expect(DEMO_ACCOUNTS).toHaveLength(ROLES.length);
    for (const role of ROLES) {
      const acc = DEMO_ACCOUNTS.find((a) => a.role === role);
      expect(acc, role).toBeDefined();
      expect(acc!.email).toMatch(/@demo\.lama\.com\.ar$/);
    }
  });
  it("usa una contraseña de demo de al menos 8 caracteres", () => {
    expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });
});
