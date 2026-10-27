import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";

export const metadata = { title: "Auditoría" };

const ACTION: Record<string, string> = {
  cambio_precio: "Cambio de precio", producto_activado: "Producto activado", producto_desactivado: "Producto desactivado",
  alta_usuario: "Alta de usuario", cambio_rol: "Cambio de rol", baja_usuario: "Baja de usuario", usuario_activado: "Usuario reactivado",
  cliente_aprobado: "Cliente aprobado", cliente_rechazado: "Cliente rechazado", cliente_pendiente: "Cliente pendiente", anulacion_pedido: "Pedido anulado",
};

function describe(action: string, d: Record<string, unknown> | null) {
  if (!d) return "";
  if (action === "cambio_precio") return `${d.producto}: $ ${d.antes} → $ ${d.despues}`;
  if (action === "cambio_rol") return `${d.email}: ${d.antes} → ${d.despues}`;
  if (action === "anulacion_pedido") return `Pedido #${d.pedido}`;
  return String(d.comercio ?? d.producto ?? d.email ?? "") + (d.rol ? ` (${d.rol})` : "");
}

type Row = { id: number; ts: string; action: string; entity: string; detail: Record<string, unknown> | null; actor_id: string | null };

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ accion?: string }> }) {
  await requireRole(["admin", "direccion"], "/admin/auditoria");
  const { accion } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("audit_log").select("id, ts, action, entity, detail, actor_id").order("ts", { ascending: false }).limit(200);
  if (accion) q = q.eq("action", accion);
  const [{ data }, { data: people }] = await Promise.all([q.returns<Row[]>(), supabase.from("profiles").select("id, full_name").neq("role", "cliente")]);
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Auditoría" description="Altas y bajas de usuarios, cambios de precios y de permisos, aprobación de clientes y anulación de pedidos." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {[["", "Todo"], ["cambio_precio", "Precios"], ["cambio_rol", "Roles"], ["cliente_aprobado", "Aprobaciones"], ["anulacion_pedido", "Anulaciones"], ["alta_usuario", "Altas"]].map(([k, l]) => (
          <Link key={k} href={k ? `/admin/auditoria?accion=${k}` : "/admin/auditoria"} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-semibold leading-9", (accion ?? "") === k ? "bg-lama-ink text-white" : "bg-white hover:bg-lama-red-soft")}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState title="Sin eventos registrados" /> : (
        <Card>
          <Table>
            <thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th><th>Usuario</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-lama-steel">{formatDateTime(r.ts)}</td>
                  <td><Badge tone={r.action.includes("precio") ? "red" : r.action.includes("rol") || r.action.includes("baja") ? "warn" : "neutral"}>{ACTION[r.action] ?? r.action}</Badge></td>
                  <td>{describe(r.action, r.detail)}</td>
                  <td className="text-lama-steel">{r.actor_id ? names.get(r.actor_id) ?? "Usuario" : "Sistema"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
