"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createPromotion, deletePromotion, updateProduct } from "@/lib/server/actions";
import { formatARS, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";

type P = { id: string; sku: string; name: string; brand: string; price: number; cost: number; stock: number };
type Promo = { id: string; product_id: string; pct: number; starts_on: string; ends_on: string };

function PriceRow({ p }: { p: P }) {
  const [price, setPrice] = useState(String(p.price));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = Number(price) !== Number(p.price);
  const margin = Number(price) > 0 ? (1 - Number(p.cost) / Number(price)) * 100 : 0;
  return (
    <tr>
      <td><p className="font-medium">{p.name}</p><p className="text-xs text-lama-steel">{p.sku} · {p.brand}</p></td>
      <td className="text-right tabular-nums text-lama-steel">{formatARS(Number(p.cost))}</td>
      <td className="text-right">
        <label className="sr-only" htmlFor={`pr-${p.id}`}>Precio de {p.name}</label>
        <input id={`pr-${p.id}`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(",", "."))} className="h-9 w-28 rounded-lg border border-lama-line px-2 text-right tabular-nums" />
      </td>
      <td className={margin < 15 ? "text-right text-lama-red tabular-nums" : "text-right tabular-nums"}>{margin.toFixed(1)} %</td>
      <td className="text-right">
        {dirty && (
          <Button size="sm" disabled={pending} onClick={() => start(async () => {
            const r = await updateProduct(p.id, { price: Number(price) });
            setMsg(r.ok ? null : r.error);
          })}>Guardar</Button>
        )}
        {msg && <p className="text-xs text-lama-red">{msg}</p>}
      </td>
    </tr>
  );
}

export function PriceEditor({ products, promos, today }: { products: P[]; promos: Promo[]; today: string }) {
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const list = products.filter((p) => `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="rounded-xl border border-lama-line bg-white">
        <div className="border-b border-lama-line p-4">
          <label htmlFor="pq" className="sr-only">Buscar producto</label>
          <input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto" className="h-10 w-full rounded-[10px] border border-lama-line px-3 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2 [&_th]:text-xs [&_th]:text-lama-steel [&_tbody_tr]:border-t [&_tbody_tr]:border-lama-line">
            <thead><tr><th className="text-left">Producto</th><th className="text-right">Costo</th><th className="text-right">Precio</th><th className="text-right">Margen</th><th /></tr></thead>
            <tbody>{list.map((p) => <PriceRow key={p.id} p={p} />)}</tbody>
          </table>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-xl border border-lama-line bg-white p-5">
          <h2 className="font-display font-bold">Nueva promoción</h2>
          <form
            className="mt-3 space-y-3 text-sm"
            action={(fd) => start(async () => {
              setErr(null);
              const r = await createPromotion(String(fd.get("product")), Number(fd.get("pct")), String(fd.get("from")), String(fd.get("to")));
              if (!r.ok) setErr(r.error);
            })}
          >
            <label className="block space-y-1"><span className="font-medium">Producto</span>
              <select name="product" required className="h-10 w-full rounded-[10px] border border-lama-line px-2">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1"><span className="font-medium">Descuento %</span><input name="pct" type="number" min={1} max={99} defaultValue={10} className="h-10 w-full rounded-[10px] border border-lama-line px-2" /></label>
              <label className="space-y-1"><span className="font-medium">Desde</span><input name="from" type="date" defaultValue={today} className="h-10 w-full rounded-[10px] border border-lama-line px-1" /></label>
              <label className="space-y-1"><span className="font-medium">Hasta</span><input name="to" type="date" className="h-10 w-full rounded-[10px] border border-lama-line px-1" required /></label>
            </div>
            {err && <p className="text-lama-red">{err}</p>}
            <Button type="submit" disabled={pending}>Crear promoción</Button>
          </form>
        </div>
        <div className="rounded-xl border border-lama-line bg-white">
          <h2 className="border-b border-lama-line px-5 py-4 font-display font-bold">Promociones</h2>
          <ul className="divide-y divide-lama-line">
            {promos.map((pr) => (
              <li key={pr.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{byId.get(pr.product_id)?.name}</p>
                  <p className="text-xs text-lama-steel">−{pr.pct} % · {formatDate(pr.starts_on)} al {formatDate(pr.ends_on)}{pr.ends_on < today ? " · vencida" : ""}</p>
                </div>
                <button aria-label="Eliminar promoción" onClick={() => start(async () => { await deletePromotion(pr.id); })} className="rounded-lg p-2 text-lama-steel hover:text-lama-red"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
