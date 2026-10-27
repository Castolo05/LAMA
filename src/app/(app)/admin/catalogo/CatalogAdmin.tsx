"use client";

import { useState, useTransition } from "react";
import { updateProduct } from "@/lib/server/actions";
import { formatARS } from "@/lib/format";

type P = { id: string; sku: string; name: string; brand: string; price: number; stock: number; active: boolean; categories: { name: string } | null };

function Row({ p }: { p: P }) {
  const [stock, setStock] = useState(String(p.stock));
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <tr className={p.active ? "" : "opacity-60"}>
      <td><p className="font-medium">{p.name}</p><p className="text-xs text-lama-steel">{p.sku} · {p.categories?.name}</p></td>
      <td className="text-right tabular-nums whitespace-nowrap">{formatARS(Number(p.price))}</td>
      <td className="text-right">
        <label className="sr-only" htmlFor={`st-${p.id}`}>Stock de {p.name}</label>
        <input id={`st-${p.id}`} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
          onBlur={() => Number(stock) !== p.stock && start(async () => { const r = await updateProduct(p.id, { stock: Number(stock) }); setErr(r.ok ? null : r.error); })}
          className="h-9 w-20 rounded-lg border border-lama-line px-2 text-right tabular-nums" />
      </td>
      <td className="text-right">
        <button disabled={pending} onClick={() => start(async () => { const r = await updateProduct(p.id, { active: !p.active }); setErr(r.ok ? null : r.error); })} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-lama-cloud">
          {p.active ? "Desactivar" : "Activar"}
        </button>
        {err && <p className="text-xs text-lama-red">{err}</p>}
      </td>
    </tr>
  );
}

export function CatalogAdmin({ products }: { products: P[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-lama-line bg-white">
      <table className="w-full text-sm [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2 [&_th]:text-xs [&_th]:text-lama-steel [&_tbody_tr]:border-t [&_tbody_tr]:border-lama-line">
        <thead><tr><th className="text-left">Producto</th><th className="text-right">Precio</th><th className="text-right">Stock</th><th /></tr></thead>
        <tbody>{products.map((p) => <Row key={p.id} p={p} />)}</tbody>
      </table>
    </div>
  );
}
