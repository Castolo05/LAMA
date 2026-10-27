export const CUTOFF_HOUR = 18;
const TZ = "America/Argentina/Buenos_Aires";

/** Fecha y hora locales de Buenos Aires para un instante. */
export function baParts(now: Date): { date: string; hour: number } {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(f.formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export function todayBA(now = new Date()): string {
  return baParts(now).date;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Misma regla que next_delivery_date() en la base: corte 18 h, entregas de lunes a sábado. */
export function nextDeliveryDate(now: Date, cutoffHour = CUTOFF_HOUR): string {
  const { date, hour } = baParts(now);
  let steps = hour >= cutoffHour ? 2 : 1;
  let d = date;
  while (steps > 0) {
    d = addDays(d, 1);
    if (new Date(`${d}T12:00:00Z`).getUTCDay() !== 0) steps--;
  }
  return d;
}

export function formatDeliveryDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
