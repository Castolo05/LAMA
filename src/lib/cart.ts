import type { Promo } from "./types";

export type CartLine = { productId: string; qty: number };
export type CartProduct = { id: string; name: string; price: number; stock: number; weight_kg: number; volume_m3: number };

export function activePromoPct(promos: Promo[], productId: string, today: string): number {
  return promos
    .filter((p) => p.product_id === productId && p.starts_on <= today && today <= p.ends_on)
    .reduce((max, p) => Math.max(max, Number(p.pct)), 0);
}

export function unitPrice(price: number, promos: Promo[], productId: string, today: string): number {
  return Math.round(price * (1 - activePromoPct(promos, productId, today) / 100) * 100) / 100;
}

export function cartTotals(lines: CartLine[], products: Map<string, CartProduct>, promos: Promo[], today: string) {
  let subtotal = 0, total = 0, bultos = 0, weightKg = 0, volumeM3 = 0;
  for (const l of lines) {
    const p = products.get(l.productId);
    if (!p) continue;
    subtotal += Number(p.price) * l.qty;
    total += unitPrice(Number(p.price), promos, p.id, today) * l.qty;
    bultos += l.qty;
    weightKg += Number(p.weight_kg) * l.qty;
    volumeM3 += Number(p.volume_m3) * l.qty;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { subtotal: r(subtotal), discount: r(subtotal - total), total: r(total), bultos, weightKg: r(weightKg), volumeM3: r(volumeM3) };
}

export function validateCart(lines: CartLine[], products: Map<string, CartProduct>): string[] {
  if (lines.length === 0) return ["El carrito está vacío"];
  const errors: string[] = [];
  for (const l of lines) {
    const p = products.get(l.productId);
    if (!p) {
      errors.push("Hay un producto que ya no está disponible");
      continue;
    }
    if (l.qty <= 0 || !Number.isInteger(l.qty)) errors.push(`Cantidad inválida: ${p.name}`);
    else if (l.qty > p.stock) errors.push(`Stock insuficiente: ${p.name} (quedan ${p.stock})`);
  }
  return errors;
}
