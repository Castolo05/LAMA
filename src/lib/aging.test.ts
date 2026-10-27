import { describe, expect, it } from "vitest";
import { agingBuckets } from "./aging";

const today = "2026-10-27";

describe("agingBuckets", () => {
  it("ubica una factura impaga vencida hace 45 días en 31–60", () => {
    const b = agingBuckets([{ amount: 1000, issued_on: "2026-08-28", due_on: "2026-09-12" }], [], today);
    expect(b.d31_60).toBe(1000);
    expect(b.total).toBe(1000);
  });
  it("aplica los pagos a la factura más vieja primero", () => {
    const b = agingBuckets(
      [
        { amount: 1000, issued_on: "2026-08-28", due_on: "2026-09-12" },
        { amount: 500, issued_on: "2026-10-20", due_on: "2026-11-04" },
      ],
      [{ amount: 1000 }],
      today,
    );
    expect(b.d31_60).toBe(0);
    expect(b.corriente).toBe(500);
    expect(b.vencido).toBe(0);
  });
  it("separa 1–30 y más de 60", () => {
    const b = agingBuckets(
      [
        { amount: 200, issued_on: "2026-10-01", due_on: "2026-10-17" },
        { amount: 300, issued_on: "2026-07-01", due_on: "2026-07-15" },
      ],
      [],
      today,
    );
    expect(b.d1_30).toBe(200);
    expect(b.d60_mas).toBe(300);
    expect(b.vencido).toBe(500);
  });
});
