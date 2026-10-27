"use client";

import { CartProvider } from "@/components/cart/CartProvider";
import { CartView } from "@/components/cart/CartView";
import { ProductCatalog } from "@/components/catalog/ProductCatalog";
import type { Channel, Product, Promo } from "@/lib/types";

/** Catálogo + carrito para cargar un pedido en nombre de un cliente (pedido telefónico). */
export function OrderBuilder(props: { storageKey: string; products: Product[]; promos: Promo[]; today: string; customerId: string; channel: Channel; afterHref: string }) {
  const { storageKey, afterHref, ...rest } = props;
  return (
    <CartProvider storageKey={storageKey}>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ProductCatalog products={rest.products} promos={rest.promos} today={rest.today} compact />
        <div className="xl:sticky xl:top-6 xl:self-start">
          <h2 className="mb-3 font-display text-lg font-bold">Pedido</h2>
          <CartView {...rest} afterHref={(id) => `${afterHref}${afterHref.includes("?") ? "&" : "?"}pedido=${id}`} emptyHint="Agregá productos desde el catálogo." />
        </div>
      </div>
    </CartProvider>
  );
}
