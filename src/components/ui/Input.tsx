import { cn } from "@/lib/cn";

const base =
  "w-full rounded-[10px] border border-lama-line bg-white px-3 py-2.5 text-sm text-lama-ink placeholder:text-lama-steel focus:border-lama-ink focus:outline-none";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24", className)} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-lama-ink">{label}</span>
      {children}
      {hint && <span className="block text-xs text-lama-steel">{hint}</span>}
    </label>
  );
}
