"use client";

import { useState, useTransition } from "react";
import { startRoute } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";

export function StartRouteButton({ routeId }: { routeId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await startRoute(routeId); if (!r.ok) setErr(r.error); })}>
        {pending ? "Iniciando…" : "Iniciar ruta"}
      </Button>
      {err && <span className="text-xs text-lama-red">{err}</span>}
    </>
  );
}
