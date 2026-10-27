export function otif(rows: { on_time: boolean | null; in_full: boolean | null }[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.on_time && r.in_full).length / rows.length;
}

export function costPerBulto(routeCost: number, bultos: number): number {
  return bultos > 0 ? routeCost / bultos : 0;
}

export function pctChange(current: number, previous: number): number {
  return previous ? (current - previous) / previous : 0;
}
