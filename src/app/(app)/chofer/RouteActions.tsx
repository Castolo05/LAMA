"use client";

import { useState, useTransition } from "react";
import { finishRoute, startRoute } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";

export function StartButton({ routeId }: { routeId: string }) {
  const [pending, start] = useTransition();
  return <Button size="lg" className="w-full" disabled={pending} onClick={() => start(async () => { await startRoute(routeId); })}>{pending ? "Iniciando…" : "Salir a reparto"}</Button>;
}

export function FinishForm({ routeId, plannedKm }: { routeId: string; plannedKm: number }) {
  const [km, setKm] = useState(String(Math.round(plannedKm)));
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-xl border border-lama-line bg-white p-4">
      <p className="font-display font-bold">Terminaste todas las entregas</p>
      <label className="block text-sm">
        <span className="font-medium">Kilómetros recorridos (odómetro)</span>
        <input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value.replace(",", "."))} className="mt-1 h-12 w-full rounded-[10px] border border-lama-line px-3 text-lg tabular-nums" />
      </label>
      {err && <p className="text-sm text-lama-red">{err}</p>}
      <Button size="lg" className="w-full" disabled={pending} onClick={() => start(async () => { const r = await finishRoute(routeId, Number(km)); if (!r.ok) setErr(r.error); })}>
        {pending ? "Cerrando…" : "Finalizar ruta"}
      </Button>
    </div>
  );
}
