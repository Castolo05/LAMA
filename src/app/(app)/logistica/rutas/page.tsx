import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDeliveryDay, todayBA } from "@/lib/delivery";
import { formatARS, formatNumber, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { StartRouteButton } from "./StartRouteButton";

export const metadata = { title: "Rutas" };

const ST = { planificada: ["Planificada", "neutral"], en_curso: ["En curso", "red"], finalizada: ["Finalizada", "ok"] } as const;
const STOP = { pendiente: "Pendiente", entregada: "Entregada", con_novedad: "Con novedad" } as const;

type R = {
  id: string; date: string; status: keyof typeof ST; km_planned: number; km_real: number | null; cost: number;
  trucks: { name: string } | null; drivers: { full_name: string } | null;
  route_stops: { id: string; seq: number; status: keyof typeof STOP; eta: string | null; delivered_at: string | null; orders: { number: number; customers: { name: string } | null } | null }[];
};

export default async function RutasPage({ searchParams }: { searchParams: Promise<{ fecha?: string; nuevas?: string }> }) {
  const { profile } = await requireRole(null, "/logistica/rutas");
  const { fecha, nuevas } = await searchParams;
  const supabase = await createClient();
  const today = todayBA();
  const { data: dates } = await supabase.from("routes").select("date").gte("date", today).order("date");
  const options = [...new Set([today, ...(dates ?? []).map((d) => d.date)])];
  const date = fecha ?? today;
  const { data } = await supabase
    .from("routes")
    .select("id, date, status, km_planned, km_real, cost, trucks(name), drivers(full_name), route_stops(id, seq, status, eta, delivered_at, orders(number, customers(name)))")
    .eq("date", date)
    .order("created_at")
    .returns<R[]>();
  const routes = data ?? [];
  const canManage = ["logistica", "admin"].includes(profile.role);

  return (
    <>
      <PageHeader
        title="Rutas"
        description={`Reparto del ${formatDeliveryDay(date)}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {options.map((d) => (
              <Link key={d} href={`/logistica/rutas?fecha=${d}`} className={d === date ? "h-10 rounded-full bg-lama-ink px-4 text-sm font-semibold leading-10 text-white" : "h-10 rounded-full bg-white px-4 text-sm font-semibold leading-10 hover:bg-lama-red-soft"}>
                {d === today ? "Hoy" : formatDeliveryDay(d).split(",")[0]}
              </Link>
            ))}
          </div>
        }
      />
      {nuevas && <p className="mb-4 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">Se confirmaron {nuevas} rutas. Los choferes ya las ven en su celular.</p>}
      {routes.length === 0 ? (
        <EmptyState title="No hay rutas para este día" description="Generalas desde el planificador con los pedidos preparados." action={canManage && <LinkButton href="/logistica/planificador">Ir al planificador</LinkButton>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {routes.map((r) => {
            const stops = [...r.route_stops].sort((a, b) => a.seq - b.seq);
            const done = stops.filter((s) => s.status !== "pendiente").length;
            return (
              <section key={r.id} className="rounded-xl border border-lama-line bg-white">
                <header className="flex flex-wrap items-center gap-3 border-b border-lama-line px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold">{r.trucks?.name}</p>
                    <p className="text-xs text-lama-steel">{r.drivers?.full_name} · {done}/{stops.length} entregas · {formatNumber(Number(r.km_real ?? r.km_planned), 1)} km · {formatARS(Number(r.cost))}</p>
                  </div>
                  <Badge tone={ST[r.status][1]}>{ST[r.status][0]}</Badge>
                  {canManage && r.status === "planificada" && <StartRouteButton routeId={r.id} />}
                </header>
                <div className="h-2 bg-lama-cloud"><div className="h-2 bg-lama-ink" style={{ width: `${stops.length ? (done / stops.length) * 100 : 0}%` }} /></div>
                <ol className="divide-y divide-lama-line text-sm">
                  {stops.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-6 text-center font-display font-bold">{s.seq}</span>
                      <span className="min-w-0 flex-1 truncate">{s.orders?.customers?.name} <span className="text-lama-steel">#{s.orders?.number}</span></span>
                      <span className="tabular-nums text-lama-steel">{s.delivered_at ? formatTime(s.delivered_at) : s.eta ? formatTime(s.eta) : ""}</span>
                      <Badge tone={s.status === "entregada" ? "ok" : s.status === "con_novedad" ? "warn" : "neutral"}>{STOP[s.status]}</Badge>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
