export type Inv = { amount: number; issued_on: string; due_on: string };
export type Buckets = { corriente: number; d1_30: number; d31_60: number; d60_mas: number; vencido: number; total: number };

const DAY = 86_400_000;

/** Saldo por antigüedad de vencimiento, aplicando los pagos a las facturas más viejas primero (FIFO). */
export function agingBuckets(invoices: Inv[], payments: { amount: number }[], today: string): Buckets {
  let credit = payments.reduce((s, p) => s + Number(p.amount), 0);
  const b: Buckets = { corriente: 0, d1_30: 0, d31_60: 0, d60_mas: 0, vencido: 0, total: 0 };
  const now = Date.parse(today);
  for (const inv of [...invoices].sort((a, c) => a.issued_on.localeCompare(c.issued_on))) {
    let open = Number(inv.amount);
    const used = Math.min(open, credit);
    open -= used;
    credit -= used;
    if (open <= 0.005) continue;
    const late = Math.floor((now - Date.parse(inv.due_on)) / DAY);
    if (late <= 0) b.corriente += open;
    else if (late <= 30) b.d1_30 += open;
    else if (late <= 60) b.d31_60 += open;
    else b.d60_mas += open;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  b.corriente = r(b.corriente); b.d1_30 = r(b.d1_30); b.d31_60 = r(b.d31_60); b.d60_mas = r(b.d60_mas);
  b.vencido = r(b.d1_30 + b.d31_60 + b.d60_mas);
  b.total = r(b.corriente + b.vencido);
  return b;
}
