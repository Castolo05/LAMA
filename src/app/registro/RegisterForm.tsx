"use client";

import { useActionState } from "react";
import { register } from "./actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";

export function RegisterForm({ defaultName, defaultEmail }: { defaultName?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-sm font-bold">Tu comercio</legend>
        <Field label="Nombre del comercio">
          <Input name="name" required placeholder="Almacén La Esquina" defaultValue={defaultName} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rubro">
            <Select name="kind" defaultValue="almacen">
              <option value="almacen">Almacén</option>
              <option value="kiosco">Kiosco</option>
              <option value="gastronomico">Gastronómico</option>
              <option value="supermercado">Autoservicio / supermercado</option>
            </Select>
          </Field>
          <Field label="CUIT" hint="Opcional">
            <Input name="cuit" inputMode="numeric" placeholder="30-12345678-9" />
          </Field>
        </div>
        <Field label="Dirección de entrega">
          <Input name="address" required placeholder="Pinto 742, Tandil" />
        </Field>
        <Field label="Teléfono">
          <Input name="phone" type="tel" placeholder="249 444-0000" />
        </Field>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-sm font-bold">Tu usuario</legend>
        <Field label="Nombre y apellido">
          <Input name="full_name" required autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </fieldset>
      {state?.error && <p className="rounded-lg bg-lama-red-soft px-3 py-2 text-sm text-lama-red-dark">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar mi comercio"}
      </Button>
      <p className="text-xs text-lama-steel">
        Ventas revisa cada alta para confirmar que el comercio está dentro de la zona de reparto. Te avisamos apenas quede aprobado.
      </p>
    </form>
  );
}
