"use client";

import { useState, useTransition } from "react";
import { addEmployee } from "@/lib/server/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export function EmployeeForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 sm:grid-cols-3 sm:items-end"
      action={(fd) =>
        start(async () => {
          const r = await addEmployee(String(fd.get("email")), String(fd.get("name")), String(fd.get("password")));
          setMsg(r.ok ? { ok: true, text: "Usuario creado. Ya puede ingresar con ese email y contraseña." } : { ok: false, text: r.error });
        })
      }
    >
      <Field label="Nombre"><Input name="name" required /></Field>
      <Field label="Email"><Input name="email" type="email" required /></Field>
      <Field label="Contraseña inicial" hint="Mínimo 8 caracteres"><Input name="password" type="password" minLength={8} required /></Field>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>{pending ? "Creando…" : "Agregar empleado"}</Button>
        {msg && <p className={msg.ok ? "mt-2 text-sm text-ok" : "mt-2 text-sm text-lama-red"}>{msg.text}</p>}
      </div>
    </form>
  );
}
