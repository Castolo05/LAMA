import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-lama-line bg-white", className)} {...props} />;
}

export function CardHeader({ title, action, className }: { title: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-lama-line px-5 py-4", className)}>
      <h2 className="text-base font-bold">{title}</h2>
      {action}
    </div>
  );
}
