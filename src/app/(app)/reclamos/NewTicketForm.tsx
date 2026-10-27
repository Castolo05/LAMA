"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTicket } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";

export function NewTicketForm({ customerId, orders, defaultOrder }: { customerId: string; orders: { id: string; number: number; label: string }[]; defaultOrder?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          setError(null);
          const r = await createTicket({
            customerId,
            orderId: String(fd.get("order") || "") || null,
            kind: String(fd.get("kind")),
            subject: String(fd.get("subject") ?? ""),
            body: String(fd.get("body") ?? ""),
          });
          if (!r.ok) return setError(r.error);
          router.push(`/reclamos/${r.data}`);
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Motivo">
          <Select name="kind" defaultValue={defaultOrder ? "faltante" : "consulta"}>
            <option value="rotura">Rotura</option>
            <option value="faltante">Faltante</option>
            <option value="demora">Demora en la entrega</option>
            <option value="consulta">Consulta</option>
            <option value="otro">Otro</option>
          </Select>
        </Field>
        <Field label="Pedido" hint="Opcional">
          <Select name="order" defaultValue={defaultOrder ?? ""}>
            <option value="">Sin pedido asociado</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Asunto"><Input name="subject" required maxLength={120} placeholder="Ej.: Faltó un pack de Coca-Cola 2,25" /></Field>
      <Field label="Mensaje"><Textarea name="body" required placeholder="Contanos qué pasó" /></Field>
      {error && <p className="text-sm text-lama-red">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar reclamo"}</Button>
    </form>
  );
}
