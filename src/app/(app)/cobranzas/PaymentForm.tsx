"use client";

import { useState, useTransition } from "react";
import { registerPayment } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";

export function PaymentForm({ customers, today }: { customers: { id: string; name: string; total: number }[]; today: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3 text-sm"
      action={(fd) => start(async () => {
        const r = await registerPayment(String(fd.get("customer")), Number(String(fd.get("amount")).replace(",", ".")), String(fd.get("date")), String(fd.get("method")));
        setMsg(r.ok ? { ok: true, t: "Pago registrado. El saldo ya está actualizado." } : { ok: false, t: r.error });
      })}
    >
      <label className="block space-y-1"><span className="font-medium">Cliente</span>
        <select name="customer" required className="h-10 w-full rounded-[10px] border border-lama-line px-2">
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1"><span className="font-medium">Importe</span><input name="amount" inputMode="decimal" required className="h-10 w-full rounded-[10px] border border-lama-line px-2" /></label>
        <label className="space-y-1"><span className="font-medium">Fecha</span><input name="date" type="date" defaultValue={today} className="h-10 w-full rounded-[10px] border border-lama-line px-2" /></label>
      </div>
      <label className="block space-y-1"><span className="font-medium">Medio</span>
        <select name="method" className="h-10 w-full rounded-[10px] border border-lama-line px-2">
          <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option><option value="echeq">eCheq</option>
        </select>
      </label>
      {msg && <p className={msg.ok ? "text-ok" : "text-lama-red"}>{msg.t}</p>}
      <Button type="submit" disabled={pending}>Registrar pago</Button>
    </form>
  );
}
