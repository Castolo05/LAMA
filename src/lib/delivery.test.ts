import { describe, expect, it } from "vitest";
import { nextDeliveryDate } from "./delivery";

// Hora de Buenos Aires = UTC-3
describe("nextDeliveryDate", () => {
  it("antes del corte entrega el día hábil siguiente", () => {
    expect(nextDeliveryDate(new Date("2026-10-27T17:59:00-03:00"))).toBe("2026-10-28");
  });
  it("después del corte suma un día hábil más", () => {
    expect(nextDeliveryDate(new Date("2026-10-27T18:00:00-03:00"))).toBe("2026-10-29");
  });
  it("el domingo no es día de entrega", () => {
    expect(nextDeliveryDate(new Date("2026-10-31T10:00:00-03:00"))).toBe("2026-11-02");
    expect(nextDeliveryDate(new Date("2026-10-31T19:00:00-03:00"))).toBe("2026-11-03");
  });
  it("usa la fecha de Buenos Aires aunque en UTC ya sea el día siguiente", () => {
    expect(nextDeliveryDate(new Date("2026-10-28T01:00:00Z"))).toBe("2026-10-29"); // 27/10 22:00 ART
  });
});
