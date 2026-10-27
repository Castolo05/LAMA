"use client";

import { useState, useTransition } from "react";
import { cancelOrder } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";

export function CancelButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="dark"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("¿Anular este pedido?")) return;
          start(async () => {
            const r = await cancelOrder(orderId);
            if (!r.ok) setError(r.error);
          });
        }}
      >
        {pending ? "Anulando…" : "Anular pedido"}
      </Button>
      {error && <p className="mt-2 text-sm text-lama-red">{error}</p>}
    </div>
  );
}
