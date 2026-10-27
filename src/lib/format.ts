const ars = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatARS(n: number): string {
  return `$ ${ars.format(n)}`;
}

export function formatDate(d: string | Date): string {
  const s = typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(d: string | Date): string {
  return new Date(d).toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

export function formatPct(n: number, digits = 1): string {
  return `${formatNumber(n * 100, digits)} %`;
}
