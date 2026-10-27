"use client";

import { useRef, useState, useTransition } from "react";
import { replyTicket } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export function ReplyBox({ ticketId, staff = false }: { ticketId: string; staff?: boolean }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = (markAs?: "respondido" | "cerrado" | "abierto") =>
    start(async () => {
      setError(null);
      const r = await replyTicket(ticketId, body, markAs);
      if (!r.ok) return setError(r.error);
      setBody("");
      ref.current?.focus();
    });
  return (
    <div className="space-y-2">
      <label htmlFor="reply" className="sr-only">Tu respuesta</label>
      <Textarea id="reply" ref={ref} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribí tu mensaje" />
      {error && <p className="text-sm text-lama-red">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => send(staff ? "respondido" : "abierto")}>{pending ? "Enviando…" : staff ? "Responder" : "Enviar"}</Button>
        {staff && <Button variant="dark" disabled={pending} onClick={() => send("cerrado")}>Responder y cerrar</Button>}
      </div>
    </div>
  );
}
