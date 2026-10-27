"use client";

import { Plus, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatARS } from "@/lib/format";

export function SuggestionList({ items }: { items: { id: string; name: string; unit: string; price: number; lastQty: number }[] }) {
  const cart = useCart();
  if (items.length === 0) return <p className="text-sm text-lama-steel">Cuando tengas algunos pedidos, acá te sugerimos qué reponer.</p>;
  return (
    <ul className="divide-y divide-lama-line">
      {items.map((p) => {
        const inCart = cart.qtyOf(p.id) > 0;
        return (
          <li key={p.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-xs text-lama-steel">{p.unit} · {formatARS(p.price)} · solés pedir {p.lastQty}</p>
            </div>
            <button
              onClick={() => cart.add(p.id, inCart ? 0 : p.lastQty)}
              aria-label={inCart ? `${p.name} ya está en el carrito` : `Agregar ${p.lastQty} de ${p.name}`}
              className={inCart ? "flex h-9 w-9 items-center justify-center rounded-lg bg-ok-soft text-ok" : "flex h-9 w-9 items-center justify-center rounded-lg bg-lama-red text-white hover:bg-lama-red-dark"}
            >
              {inCart ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
