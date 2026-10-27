import Link from "next/link";
import { CheckCircle2, ChevronRight, Navigation, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDeliveryDay, todayBA } from "@/lib/delivery";
import { formatNumber, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { FinishForm, StartButton } from "./RouteActions";

export const metadata = { title: "Mi ruta" };

type R = {
  id: string; date: string; status: "planificada" | "en_curso" | "finalizada"; km_planned: number; km_real: number | null;
  trucks: { name: string; plate: string } | null;
  route_stops: { id: string; seq: number; status: "pendiente" | "entregada" | "con_novedad"; eta: string | null; delivered_at: string | null; orders: { number: number; customers: { name: string; address: string; lat: number; lng: number } | null } | null }[];
};

export default async function ChoferPage() {
  const { profile } = await requireRole(["chofer"], "/chofer");
  const supabase = await createClient();
  const today = todayBA();
  const { data: routes } = await supabase
    .from("routes")
    .select("id, date, status, km_planned, km_real, trucks(name, plate), route_stops(id, seq, status, eta, delivered_at, orders(number, customers(name, address, lat, lng)))")
    .gte("date", today)
    .order("date")
    .limit(2)
    .returns<R[]>();
  const route = (routes ?? []).find((r) => r.status !== "finalizada") ?? (routes ?? [])[0];
  if (!route) return <EmptyState title="No tenés rutas asignadas" description="Cuando Logística confirme tu hoja de ruta, aparece acá." />;

  const stops = [...route.route_stops].sort((a, b) => a.seq - b.seq);
  const done = stops.filter((s) => s.status !== "pendiente").length;
  const next = stops.find((s) => s.status === "pendiente");

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-sm text-lama-steel">{route.date === today ? "Hoy" : formatDeliveryDay(route.date)} · {route.trucks?.name} · {route.trucks?.plate}</p>
        <h1 className="energetic text-3xl">Hola, {profile.full_name.split(" ")[0]}</h1>
      </div>
      <div className="rounded-xl bg-lama-ink p-5 text-white">
        <div className="flex items-end justify-between">
          <p className="font-display text-4xl font-bold tabular-nums">{done}<span className="text-xl text-white/60">/{stops.length}</span></p>
          <p className="text-sm text-white/70">{formatNumber(Number(route.km_planned), 1)} km planificados</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/15"><div className="h-2 rounded-full bg-lama-red" style={{ width: `${stops.length ? (done / stops.length) * 100 : 0}%` }} /></div>
        <p className="mt-2 text-sm text-white/80">{route.status === "finalizada" ? "Ruta finalizada." : next ? `Próxima: ${next.orders?.customers?.name}` : "Todas las entregas registradas."}</p>
      </div>

      {route.status === "planificada" && <StartButton routeId={route.id} />}
      {route.status === "en_curso" && !next && <FinishForm routeId={route.id} plannedKm={Number(route.km_planned)} />}

      <ol className="space-y-2">
        {stops.map((s) => {
          const c = s.orders?.customers;
          const isNext = s.id === next?.id && route.status === "en_curso";
          return (
            <li key={s.id} className={cn("rounded-xl border bg-white", isNext ? "border-lama-red" : "border-lama-line")}>
              <div className="flex items-center gap-3 p-4">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display font-bold", s.status === "entregada" ? "bg-ok text-white" : s.status === "con_novedad" ? "bg-warn text-white" : isNext ? "bg-lama-red text-white" : "bg-lama-cloud")}>
                  {s.status === "entregada" ? <CheckCircle2 className="h-5 w-5" /> : s.status === "con_novedad" ? <TriangleAlert className="h-5 w-5" /> : s.seq}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c?.name}</p>
                  <p className="truncate text-sm text-lama-steel">{c?.address} · #{s.orders?.number}</p>
                  <p className="text-xs text-lama-steel">{s.delivered_at ? `Entregado ${formatTime(s.delivered_at)}` : s.eta ? `Estimado ${formatTime(s.eta)}` : ""}</p>
                </div>
                {s.status === "pendiente" && c && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" aria-label={`Navegar a ${c.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg bg-lama-cloud text-lama-ink hover:bg-lama-red-soft">
                    <Navigation className="h-5 w-5" />
                  </a>
                )}
              </div>
              {s.status === "pendiente" && route.status === "en_curso" && (
                <Link href={`/chofer/parada/${s.id}`} className={cn("flex items-center justify-between border-t px-4 py-3 font-display text-sm font-bold", isNext ? "border-lama-red bg-lama-red text-white rounded-b-xl" : "border-lama-line text-lama-ink")}>
                  Registrar entrega <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
