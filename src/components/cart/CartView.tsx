"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Truck } from "lucide-react";
import { useCart } from "./CartProvider";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { cartTotals, unitPrice, validateCart } from "@/lib/cart";
import { formatDeliveryDay, nextDeliveryDate } from "@/lib/delivery";
import { formatARS, formatNumber } from "@/lib/format";
import { placeOrder } from "@/lib/server/actions";
import type { Channel, Product, Promo } from "@/lib/types";
import { Button } from "@/components/ui/Button";

type Props = {
  products: Product[];
  promos: Promo[];
  today: string;
  customerId: string;
  channel: Channel;
  /** Adónde ir después de confirmar; recibe el id del pedido. */
  afterHref?: (orderId: string) => string;
  emptyHint?: React.ReactNode;
};

export function CartView({ products, promos, today, customerId, channel, afterHref = (id) => `/pedidos/${id}?nuevo=1`, emptyHint }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const totals = cartTotals(cart.lines, byId, promos, today);
  const problems = cart.lines.length ? validateCart(cart.lines, byId) : [];
  const delivery = formatDeliveryDay(nextDeliveryDate(new Date()));

  function confirm() {
    setError(null);
    start(async () => {
      const res = await placeOrder(customerId, cart.lines.map((l) => ({ product_id: l.productId, qty: l.qty })), channel);
      if (!res.ok) return setError(res.error);
      cart.clear();
      router.push(afterHref(res.data!));
    });
  }

  if (cart.lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-lama-line bg-white px-6 py-10 text-center">
        <p className="font-display font-bold">El carrito está vacío</p>
        <div className="mt-2 text-sm text-lama-steel">{emptyHint ?? "Agregá productos desde el catálogo."}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-lama-line bg-white">
      <ul className="divide-y divide-lama-line">
        {cart.lines
          .map((l) => ({ l, p: byId.get(l.productId) }))
          .sort((a, b) => (a.p?.name ?? "").localeCompare(b.p?.name ?? ""))
          .map(({ l, p }) => (
            <li key={l.productId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p?.name ?? "Producto no disponible"}</p>
                {p && <p className="text-xs text-lama-steel">{p.unit} · {formatARS(unitPrice(Number(p.price), promos, p.id, today))} c/u</p>}
              </div>
              {p && <QtyStepper value={l.qty} max={p.stock} onChange={(n) => cart.setQty(p.id, n)} label={p.name} />}
              <p className="w-28 text-right font-semibold tabular-nums">{p ? formatARS(unitPrice(Number(p.price), promos, p.id, today) * l.qty) : "—"}</p>
              <button onClick={() => cart.setQty(l.productId, 0)} aria-label={`Quitar ${p?.name ?? "producto"}`} className="rounded-lg p-2 text-lama-steel hover:bg-lama-cloud hover:text-lama-red">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
      </ul>
      <div className="space-y-1.5 border-t border-lama-line bg-lama-cloud/60 px-4 py-4 text-sm">
        <p className="flex justify-between"><span className="text-lama-steel">Subtotal ({totals.bultos} bultos · {formatNumber(totals.weightKg)} kg)</span><span className="tabular-nums">{formatARS(totals.subtotal)}</span></p>
        {totals.discount > 0 && <p className="flex justify-between text-ok"><span>Promociones</span><span className="tabular-nums">−{formatARS(totals.discount)}</span></p>}
        <p className="flex justify-between pt-1 font-display text-lg font-bold"><span>Total</span><span className="tabular-nums">{formatARS(totals.total)}</span></p>
        <p className="flex items-center gap-2 pt-2 text-lama-ink"><Truck className="h-4 w-4 text-lama-red" /> Llega el {delivery}</p>
      </div>
      <div className="space-y-3 px-4 pb-4 pt-3">
        {[...problems, ...(error ? [error] : [])].map((m) => (
          <p key={m} className="rounded-lg bg-lama-red-soft px-3 py-2 text-sm text-lama-red-dark">{m}</p>
        ))}
        <Button className="w-full" size="lg" onClick={confirm} disabled={pending || problems.length > 0}>
          {pending ? "Enviando pedido…" : "Confirmar pedido"}
        </Button>
      </div>
    </div>
  );
}
