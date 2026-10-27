import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export type Msg = { id: string; body: string; created_at: string; author_id: string | null; profiles: { full_name: string; role: string } | null };

export function TicketThread({ messages, viewerId }: { messages: Msg[]; viewerId: string }) {
  return (
    <ol className="space-y-3">
      {messages.map((m) => {
        const fromLama = m.profiles ? m.profiles.role !== "cliente" : m.author_id === null;
        const mine = m.author_id === viewerId;
        return (
          <li key={m.id} className={cn("max-w-[85%] rounded-xl px-4 py-3", mine ? "ml-auto bg-lama-ink text-white" : fromLama ? "bg-lama-red-soft" : "bg-lama-cloud")}>
            <p className={cn("text-xs font-semibold", mine ? "text-white/70" : "text-lama-steel")}>
              {m.profiles?.full_name || (fromLama ? "Lama" : "Comercio")}{fromLama && m.profiles ? " · Lama" : ""} · {formatDateTime(m.created_at)}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
