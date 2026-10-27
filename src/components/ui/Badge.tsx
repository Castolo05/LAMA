import { cn } from "@/lib/cn";

type Tone = "neutral" | "red" | "ok" | "warn" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-lama-cloud text-lama-ink",
  red: "bg-lama-red-soft text-lama-red-dark",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  dark: "bg-lama-ink text-white",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
