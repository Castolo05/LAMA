import { cn } from "@/lib/cn";

export function Stat({ label, value, delta, tone = "neutral" }: { label: string; value: string; delta?: string; tone?: "neutral" | "ok" | "red" }) {
  return (
    <div className="rounded-xl border border-lama-line bg-white p-4">
      <p className="text-sm text-lama-steel">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
      {delta && <p className={cn("mt-1 text-xs font-medium", tone === "ok" && "text-ok", tone === "red" && "text-lama-red", tone === "neutral" && "text-lama-steel")}>{delta}</p>}
    </div>
  );
}
