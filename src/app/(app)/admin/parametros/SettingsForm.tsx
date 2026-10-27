"use client";

import { useState, useTransition } from "react";
import { updateSetting } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";

const META: Record<string, { label: string; hint: string; unit: string }> = {
  cost_per_km: { label: "Costo por kilómetro", hint: "Combustible, desgaste y mantenimiento por km recorrido.", unit: "$" },
  driver_day_cost: { label: "Costo fijo por chofer y jornada", hint: "Sueldo y cargas del chofer por día de reparto.", unit: "$" },
  cutoff_hour: { label: "Horario de corte de pedidos", hint: "Los pedidos posteriores salen un día hábil después.", unit: "h" },
  satellite_min_kg: { label: "Carga mínima para viajar a una localidad", hint: "Debajo de este peso el planificador posterga el viaje.", unit: "kg" },
};

export function SettingsForm({ settings }: { settings: { key: string; value: number }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {settings.filter((s) => META[s.key]).map((s) => <Item key={s.key} k={s.key} value={s.value} />)}
    </div>
  );
}

function Item({ k, value }: { k: string; value: number }) {
  const m = META[k];
  const [v, setV] = useState(String(value));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="rounded-xl border border-lama-line bg-white p-5" action={() => start(async () => { const r = await updateSetting(k, Number(v)); setMsg(r.ok ? { ok: true, t: "Guardado" } : { ok: false, t: r.error }); })}>
      <label className="block">
        <span className="font-display font-bold">{m.label}</span>
        <span className="mt-0.5 block text-sm text-lama-steel">{m.hint}</span>
        <span className="mt-3 flex items-center gap-2">
          <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} className="h-11 w-40 rounded-[10px] border border-lama-line px-3 text-lg tabular-nums" />
          <span className="text-sm text-lama-steel">{m.unit}</span>
        </span>
      </label>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || Number(v) === value}>Guardar</Button>
        {msg && <span className={msg.ok ? "text-sm text-ok" : "text-sm text-lama-red"}>{msg.t}</span>}
      </div>
    </form>
  );
}
