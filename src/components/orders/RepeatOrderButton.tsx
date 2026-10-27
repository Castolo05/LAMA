"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { buttonClass } from "@/components/ui/Button";

export function RepeatOrderButton({ items, href = "/carrito", variant = "primary" }: { items: { productId: string; qty: number }[]; href?: string; variant?: "primary" | "outline" }) {
  const cart = useCart();
  const router = useRouter();
  return (
    <button
      className={buttonClass(variant)}
      disabled={items.length === 0}
      onClick={() => {
        cart.replace(items);
        router.push(href);
      }}
    >
      <RotateCcw className="h-4 w-4" /> Repetir último pedido
    </button>
  );
}
