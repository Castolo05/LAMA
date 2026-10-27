"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Snowflake } from "lucide-react";
import { prepareOrder, startPreparing } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Item = { id: string; qty: number; name: string; unit: string; stock: number; zone: "Secos" | "Frescos" | "Frío" };

export function PickList({ orderId, status, items }: { orderId: string; status: string; items: Item[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, Math.min(i.qty, i.stock)])));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const missing = items.filter((i) => (qty[i.id] ?? 0) < i.qty);
  const allChecked = items.every((i) => checked[i.id]);

  return (
    <div className="space-y-6">
      {status === "recibido" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-lama-cloud p-4">
          <p className="flex-1 text-sm">Marcá el inicio para que el cliente vea que su pedido está en preparación.</p>
          <Button size="sm" variant="dark" disabled={pending} onClick={() => start(async () => { await startPreparing(orderId); router.refresh(); })}>Empezar preparación</Button>
        </div>
      )}
      {(["Secos", "Frescos", "Frío"] as const).map((zone) => {
        const list = items.filter((i) => i.zone === zone);
        if (!list.length) return null;
        return (
          <section key={zone} className="rounded-xl border border-lama-line bg-white">
            <h2 className={cn("flex items-center gap-2 rounded-t-xl px-5 py-3 font-display font-bold", zone === "Secos" ? "bg-lama-cloud" : "bg-lama-ink text-white")}>
              {zone !== "Secos" && <Snowflake className="h-4 w-4" />}{zone === "Secos" ? "Secos y bebidas" : zone === "Frescos" ? "Frescos (cámara)" : "Congelados (cámara de frío)"}
            </h2>
            <ul className="divide-y divide-lama-line">
              {list.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <button
                    aria-label={`Marcar ${i.name} como preparado`}
                    aria-pressed={!!checked[i.id]}
                    onClick={() => setChecked((c) => ({ ...c, [i.id]: !c[i.id] }))}
                    className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2", checked[i.id] ? "border-ok bg-ok text-white" : "border-lama-line")}
                  >
                    {checked[i.id] && <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", checked[i.id] && "text-lama-steel line-through")}>{i.name}</p>
                    <p className="text-xs text-lama-steel">{i.unit} · stock {i.stock}</p>
                  </div>
                  <span className="text-sm text-lama-steel">Pedido {i.qty}</span>
                  <label className="flex items-center gap-2 text-sm">
                    <span>Preparado</span>
                    <input
                      type="number"
                      min={0}
                      max={i.qty}
                      value={qty[i.id]}
                      onChange={(e) => setQty((q) => ({ ...q, [i.id]: Math.max(0, Math.min(i.qty, Number(e.target.value) || 0)) }))}
                      className={cn("h-9 w-16 rounded-lg border px-2 text-center tabular-nums", (qty[i.id] ?? 0) < i.qty ? "border-warn bg-warn-soft" : "border-lama-line")}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {missing.length > 0 && (
        <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
          Faltan {missing.length} {missing.length === 1 ? "producto" : "productos"}. Al confirmar, el cliente recibe un aviso con el detalle y el importe se ajusta.
        </p>
      )}
      {error && <p className="text-sm text-lama-red">{error}</p>}
      <Button
        size="lg"
        disabled={pending || !allChecked}
        onClick={() => start(async () => {
          setError(null);
          const r = await prepareOrder(orderId, items.map((i) => ({ item_id: i.id, qty_prepared: qty[i.id] ?? 0 })));
          if (!r.ok) return setError(r.error);
          router.push("/deposito");
        })}
      >
        {pending ? "Guardando…" : allChecked ? "Pedido preparado" : "Marcá todos los productos para terminar"}
      </Button>
    </div>
  );
}
