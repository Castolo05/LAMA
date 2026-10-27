"use client";

import { useState, useTransition } from "react";
import { approveCustomer } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";

export function ApproveButtons({ customerId }: { customerId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const act = (ok: boolean) => start(async () => {
    const r = await approveCustomer(customerId, ok);
    if (!r.ok) setError(r.error);
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => act(true)}>Aprobar</Button>
      <Button size="sm" variant="dark" disabled={pending} onClick={() => act(false)}>Rechazar</Button>
      {error && <span className="text-xs text-lama-red">{error}</span>}
    </div>
  );
}
