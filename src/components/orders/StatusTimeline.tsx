import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/types";

const STEPS: { key: OrderStatus[]; label: string }[] = [
  { key: ["recibido"], label: "Recibido" },
  { key: ["en_preparacion", "preparado"], label: "En preparación" },
  { key: ["en_reparto"], label: "En reparto" },
  { key: ["entregado", "con_novedad"], label: "Entregado" },
];

export function StatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "anulado") return <p className="rounded-lg bg-lama-cloud px-4 py-3 text-sm">Este pedido fue anulado.</p>;
  const current = STEPS.findIndex((s) => s.key.includes(status));
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const done = i < current || (i === current && (status === "entregado" || status === "con_novedad"));
        const active = i === current && !done;
        return (
          <li key={s.label} className="min-w-0">
            <div className={cn("h-2 rounded-full", done ? "bg-lama-ink" : active ? "bg-lama-red" : "bg-lama-line")} />
            <p className={cn("mt-2 flex items-center gap-1 text-xs font-semibold sm:text-sm", done || active ? "text-lama-ink" : "text-lama-steel")}>
              {done && <Check className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{s.label}</span>
            </p>
            {i === 3 && status === "con_novedad" && <p className="text-xs text-warn">Con novedad</p>}
          </li>
        );
      })}
    </ol>
  );
}
