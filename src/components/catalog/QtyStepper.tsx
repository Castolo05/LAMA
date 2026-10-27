"use client";

import { Minus, Plus } from "lucide-react";

export function QtyStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex h-10 items-center rounded-[10px] border border-lama-line bg-white">
      <button type="button" aria-label={`Quitar uno de ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-full w-10 items-center justify-center text-lama-ink hover:bg-lama-cloud disabled:opacity-40" disabled={value === 0}>
        <Minus className="h-4 w-4" />
      </button>
      <input
        aria-label={`Cantidad de ${label}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          onChange(Math.min(max, Number.isFinite(n) ? n : 0));
        }}
        className="h-full w-10 border-x border-lama-line text-center text-sm font-semibold tabular-nums focus:outline-none"
      />
      <button type="button" aria-label={`Agregar uno de ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-full w-10 items-center justify-center text-lama-ink hover:bg-lama-cloud disabled:opacity-40" disabled={value >= max}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
