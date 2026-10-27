"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deliverStop } from "@/lib/server/actions";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { Button } from "@/components/ui/Button";

type Item = { item_id: string; name: string; unit: string; qty: number; qty_prepared: number | null };

export function DeliveryForm({ stopId, items }: { stopId: string; items: Item[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.item_id, i.qty_prepared ?? i.qty])));
  const [ret, setRet] = useState({ cajones: 0, envases: 0 });
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const short = items.some((i) => (qty[i.item_id] ?? 0) < i.qty);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-lama-line bg-white">
        <h2 className="border-b border-lama-line px-4 py-3 font-display font-bold">Productos entregados</h2>
        <ul className="divide-y divide-lama-line">
          {items.map((i) => (
            <li key={i.item_id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{i.name}</p>
                <p className="text-xs text-lama-steel">{i.unit} · cargado {i.qty_prepared ?? i.qty}</p>
              </div>
              <QtyStepper value={qty[i.item_id]} max={i.qty_prepared ?? i.qty} onChange={(n) => setQty((q) => ({ ...q, [i.item_id]: n }))} label={i.name} />
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-lama-line bg-white p-4">
        <h2 className="font-display font-bold">Envases retornables recolectados</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([["cajones", "Cajones de botellas"], ["envases", "Envases / bidones"]] as const).map(([k, l]) => (
            <div key={k}>
              <p className="mb-1 text-sm">{l}</p>
              <QtyStepper value={ret[k]} max={99} onChange={(n) => setRet((r) => ({ ...r, [k]: n }))} label={l} />
            </div>
          ))}
        </div>
      </section>
      <label className="block">
        <span className="text-sm font-medium">Novedad {short ? "(obligatoria: hay faltantes)" : "(opcional)"}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: una botella rota, el local estaba cerrado…" className="mt-1 min-h-20 w-full rounded-[10px] border border-lama-line bg-white px-3 py-2 text-sm" />
      </label>
      {err && <p className="text-sm text-lama-red">{err}</p>}
      <Button
        size="lg"
        className="w-full"
        disabled={pending || (short && !note.trim())}
        onClick={() => start(async () => {
          setErr(null);
          const r = await deliverStop(stopId, items.map((i) => ({ item_id: i.item_id, qty_delivered: qty[i.item_id] ?? 0 })), [{ kind: "cajones", qty: ret.cajones }, { kind: "envases", qty: ret.envases }], note);
          if (!r.ok) return setErr(r.error);
          router.push("/chofer");
        })}
      >
        {pending ? "Registrando…" : short ? "Confirmar entrega con novedad" : "Confirmar entrega"}
      </Button>
    </div>
  );
}
