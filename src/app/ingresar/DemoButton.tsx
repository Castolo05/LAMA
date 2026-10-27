"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function DemoButton({ label, person }: { label: string; person: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-between gap-2 rounded-[10px] border border-lama-line bg-white px-3 py-2.5 text-left transition-colors hover:border-lama-red hover:bg-lama-red-soft disabled:opacity-60"
    >
      <span className="min-w-0">
        <span className="block font-display text-sm font-bold text-lama-ink">{label}</span>
        <span className="block truncate text-xs text-lama-steel">{person}</span>
      </span>
      {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-lama-red" />}
    </button>
  );
}
