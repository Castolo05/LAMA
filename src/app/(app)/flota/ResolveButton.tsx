"use client";

import { useTransition } from "react";
import { resolveAlert } from "@/lib/server/actions";

export function ResolveButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => { await resolveAlert(id); })} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-lama-ink hover:bg-lama-cloud disabled:opacity-50">
      {pending ? "Guardando…" : "Marcar resuelta"}
    </button>
  );
}
