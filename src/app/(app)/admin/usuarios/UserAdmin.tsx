"use client";

import { useState, useTransition } from "react";
import { adminCreateUser, adminUpdateUser } from "@/lib/server/actions";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type U = { id: string; full_name: string; email: string | null; role: Role; active: boolean; customers: { name: string } | null };
const INTERNAL: Role[] = ["admin", "direccion", "ventas", "logistica"];

function Row({ u }: { u: U }) {
  const [role, setRole] = useState(u.role);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = (r: Role, active: boolean) => start(async () => { const x = await adminUpdateUser(u.id, r, active); setErr(x.ok ? null : x.error); });
  const locked = ["cliente", "chofer", "proveedor"].includes(u.role);
  return (
    <tr className={u.active ? "" : "opacity-60"}>
      <td><p className="font-medium">{u.full_name || "—"}</p><p className="text-xs text-lama-steel">{u.email}{u.customers ? ` · ${u.customers.name}` : ""}</p></td>
      <td>
        {locked ? <Badge>{ROLE_LABEL[u.role]}</Badge> : (
          <select aria-label={`Rol de ${u.full_name}`} value={role} onChange={(e) => { setRole(e.target.value as Role); save(e.target.value as Role, u.active); }} className="h-9 rounded-lg border border-lama-line px-2 text-sm" disabled={pending}>
            {INTERNAL.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        )}
      </td>
      <td>{u.active ? <Badge tone="ok">Activo</Badge> : <Badge tone="dark">Inactivo</Badge>}</td>
      <td className="text-right">
        <button disabled={pending} onClick={() => save(role, !u.active)} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold hover:bg-lama-cloud">{u.active ? "Desactivar" : "Activar"}</button>
        {err && <p className="text-xs text-lama-red">{err}</p>}
      </td>
    </tr>
  );
}

export function UserAdmin({ users }: { users: U[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const list = users.filter((u) => `${u.full_name} ${u.email} ${u.customers?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-xl border border-lama-line bg-white">
        <div className="border-b border-lama-line p-4">
          <label htmlFor="uq" className="sr-only">Buscar usuario</label>
          <input id="uq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, email o comercio" className="h-10 w-full rounded-[10px] border border-lama-line px-3 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:text-lama-steel [&_tbody_tr]:border-t [&_tbody_tr]:border-lama-line">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th /></tr></thead>
            <tbody>{list.map((u) => <Row key={u.id} u={u} />)}</tbody>
          </table>
        </div>
      </div>
      <div className="space-y-6">
        <div className="rounded-xl border border-lama-line bg-white p-5">
          <h2 className="font-display font-bold">Nuevo usuario interno</h2>
          <form
            className="mt-3 space-y-3 text-sm"
            action={(fd) => start(async () => {
              const r = await adminCreateUser(String(fd.get("email")), String(fd.get("name")), String(fd.get("role")), String(fd.get("password")));
              setMsg(r.ok ? { ok: true, t: "Usuario creado." } : { ok: false, t: r.error });
            })}
          >
            <label className="block space-y-1"><span className="font-medium">Nombre y apellido</span><input name="name" required className="h-10 w-full rounded-[10px] border border-lama-line px-3" /></label>
            <label className="block space-y-1"><span className="font-medium">Email</span><input name="email" type="email" required className="h-10 w-full rounded-[10px] border border-lama-line px-3" /></label>
            <label className="block space-y-1"><span className="font-medium">Rol</span>
              <select name="role" className="h-10 w-full rounded-[10px] border border-lama-line px-2">{INTERNAL.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            </label>
            <label className="block space-y-1"><span className="font-medium">Contraseña inicial</span><input name="password" type="password" minLength={8} required className="h-10 w-full rounded-[10px] border border-lama-line px-3" /></label>
            {msg && <p className={msg.ok ? "text-ok" : "text-lama-red"}>{msg.t}</p>}
            <Button type="submit" disabled={pending}>Crear usuario</Button>
          </form>
        </div>
        <div className="rounded-xl bg-lama-cloud p-5 text-sm">
          <p className="font-display font-bold">Verificación en dos pasos</p>
          <p className="mt-1 text-lama-steel">Obligatoria para Administrador, Dirección y Cobranzas. Próximamente.</p>
        </div>
      </div>
    </div>
  );
}
