const DAY = 86_400_000;

/** Productos comprados al menos 3 veces cuyo intervalo promedio de compra ya se cumplió. */
export function suggestReorder(history: { product_id: string; ordered_on: string }[], today: string, limit = 6): string[] {
  const byProduct = new Map<string, number[]>();
  for (const h of history) {
    const t = Date.parse(h.ordered_on.slice(0, 10));
    const arr = byProduct.get(h.product_id) ?? [];
    if (!arr.includes(t)) arr.push(t);
    byProduct.set(h.product_id, arr);
  }
  const now = Date.parse(today);
  const due: { id: string; ratio: number }[] = [];
  for (const [id, dates] of byProduct) {
    if (dates.length < 3) continue;
    dates.sort((a, b) => a - b);
    const mean = (dates[dates.length - 1] - dates[0]) / (dates.length - 1);
    const since = now - dates[dates.length - 1];
    if (mean > 0 && since >= mean) due.push({ id, ratio: since / mean });
  }
  return due.sort((a, b) => b.ratio - a.ratio).slice(0, limit).map((d) => d.id);
}

export { DAY };
