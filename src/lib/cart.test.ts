import { describe, expect, it } from "vitest";
import { cartTotals, unitPrice, validateCart } from "./cart";

const coca = { id: "p1", name: "Coca-Cola 2,25 L", price: 1000, stock: 5, weight_kg: 14, volume_m3: 0.02 };
const yerba = { id: "p2", name: "Yerba mate 1 kg", price: 500, stock: 10, weight_kg: 10, volume_m3: 0.02 };
const products = new Map([coca, yerba].map((p) => [p.id, p]));

describe("cartTotals", () => {
  it("aplica la promoción vigente y no la vencida", () => {
    const promos = [
      { product_id: "p1", pct: 10, starts_on: "2026-10-20", ends_on: "2026-11-15" },
      { product_id: "p2", pct: 50, starts_on: "2026-09-01", ends_on: "2026-09-30" },
    ];
    const t = cartTotals([{ productId: "p1", qty: 2 }, { productId: "p2", qty: 1 }], products, promos, "2026-10-27");
    expect(t.subtotal).toBe(2500);
    expect(t.discount).toBe(200);
    expect(t.total).toBe(2300);
    expect(t.bultos).toBe(3);
    expect(t.weightKg).toBe(38);
  });
});

describe("unitPrice", () => {
  it("redondea a centavos", () => {
    expect(unitPrice(999, [{ product_id: "p1", pct: 7, starts_on: "2026-10-01", ends_on: "2026-10-31" }], "p1", "2026-10-27")).toBe(929.07);
  });
});

describe("validateCart", () => {
  it("informa stock insuficiente con el nombre del producto", () => {
    expect(validateCart([{ productId: "p1", qty: 6 }], products)).toEqual(["Stock insuficiente: Coca-Cola 2,25 L (quedan 5)"]);
  });
  it("informa carrito vacío", () => {
    expect(validateCart([], products)).toEqual(["El carrito está vacío"]);
  });
  it("informa productos que ya no están disponibles", () => {
    expect(validateCart([{ productId: "zz", qty: 1 }], products)).toEqual(["Hay un producto que ya no está disponible"]);
  });
});
