"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Snowflake } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { QtyStepper } from "./QtyStepper";
import { activePromoPct, unitPrice } from "@/lib/cart";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LINE_LABEL, type Product, type ProductLine, type Promo } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const LINE_STYLE: Record<ProductLine, string> = {
  coca_cola: "bg-lama-red text-white",
  secos: "bg-lama-ink text-white",
  frescos: "bg-[#e9ecf1] text-lama-ink",
  congelados: "bg-[#2b2f36] text-white",
};

export function ProductCatalog({ products, promos, today, compact = false, readOnly = false }: { products: Product[]; promos: Promo[]; today: string; compact?: boolean; readOnly?: boolean }) {
  const cart = useCart();
  const [q, setQ] = useState("");
  const [line, setLine] = useState<ProductLine | "todas">("todas");
  const [onlyLow, setOnlyLow] = useState(false);
  const [onlyPromo, setOnlyPromo] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (line === "todas" || p.categories?.line === line) &&
        (!onlyLow || p.low_sugar) &&
        (!onlyPromo || activePromoPct(promos, p.id, today) > 0) &&
        (!needle || `${p.name} ${p.brand} ${p.categories?.name ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [products, promos, today, q, line, onlyLow, onlyPromo]);

  const lines: (ProductLine | "todas")[] = ["todas", "coca_cola", "secos", "frescos", "congelados"];

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1">
          <label htmlFor="cat-search" className="sr-only">Buscar productos</label>
          <input
            id="cat-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por producto o marca"
            className="h-11 min-w-0 flex-1 rounded-l-[10px] border border-r-0 border-lama-line bg-white px-3 text-sm focus:border-lama-ink focus:outline-none"
          />
          <span className="flex h-11 w-12 items-center justify-center rounded-r-[10px] bg-lama-ink text-white" aria-hidden>
            <Search className="h-4 w-4" />
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {lines.map((l) => (
            <button
              key={l}
              onClick={() => setLine(l)}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors",
                line === l ? "bg-lama-ink text-white" : "bg-white text-lama-ink hover:bg-lama-red-soft",
              )}
            >
              {l === "todas" ? "Todo" : LINE_LABEL[l]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)} className="h-4 w-4 accent-lama-red" />
          Con promoción
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="h-4 w-4 accent-lama-red" />
          Sin azúcar o reducido en azúcar
        </label>
        <span className="text-lama-steel">{filtered.length} productos</span>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-lama-steel">No encontramos productos con esos filtros. Probá con otra búsqueda.</p>
      ) : (
        <ul className={cn("mt-5 grid gap-3", compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
          {filtered.map((p) => {
            const pct = activePromoPct(promos, p.id, today);
            const price = unitPrice(Number(p.price), promos, p.id, today);
            const qty = cart.qtyOf(p.id);
            const line = p.categories?.line ?? "secos";
            return (
              <li key={p.id} className={cn("flex flex-col overflow-hidden rounded-xl border bg-white", qty > 0 ? "border-lama-red" : "border-lama-line")}>
                {p.image_url ? (
                  <div className="relative aspect-[4/3] bg-lama-cloud">
                    <Image src={p.image_url} alt="" fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw" className="object-cover" />
                    <span className={cn("absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold leading-none", LINE_STYLE[line])}>
                      {p.brand}
                      {p.needs_cold && <Snowflake className="h-3.5 w-3.5" aria-label="Requiere frío" />}
                    </span>
                    {pct > 0 && <span className="absolute top-3 right-3 rounded-md bg-white px-2 py-0.5 text-xs font-bold text-lama-red">−{pct}%</span>}
                  </div>
                ) : (
                  <div className={cn("relative flex h-24 items-end justify-between px-4 pb-3", LINE_STYLE[line])}>
                    <span className="energetic text-2xl leading-none">{p.brand}</span>
                    <span className="flex gap-1">
                      {p.needs_cold && <Snowflake className="h-4 w-4" aria-label="Requiere frío" />}
                    </span>
                    {pct > 0 && <span className="absolute top-3 right-3 rounded-md bg-white px-2 py-0.5 text-xs font-bold text-lama-red">−{pct}%</span>}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <p className="font-semibold leading-snug">{p.name}</p>
                  <p className="mt-0.5 text-sm text-lama-steel">{p.unit} · {p.categories?.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.low_sugar && <Badge tone="ok">Sin / reducido en azúcar</Badge>}
                    {p.stock < 20 && <Badge tone="warn">Últimos {p.stock}</Badge>}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <div>
                      {pct > 0 && <p className="text-xs text-lama-steel line-through">{formatARS(Number(p.price))}</p>}
                      <p className="font-display text-lg font-bold tabular-nums">{formatARS(price)}</p>
                    </div>
                    {readOnly ? (
                      <span className="text-sm text-lama-steel">Stock: {p.stock}</span>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => cart.add(p.id)}
                        disabled={p.stock === 0}
                        className="h-10 rounded-[10px] bg-lama-red px-4 font-display text-sm font-bold text-white hover:bg-lama-red-dark disabled:bg-lama-steel"
                      >
                        {p.stock === 0 ? "Sin stock" : "Agregar"}
                      </button>
                    ) : (
                      <QtyStepper value={qty} max={p.stock} onChange={(n) => cart.setQty(p.id, n)} label={p.name} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
