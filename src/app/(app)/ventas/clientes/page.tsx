import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ApproveButtons } from "./ApproveButtons";

export const metadata = { title: "Clientes" };

const KIND: Record<string, string> = { almacen: "Almacén", kiosco: "Kiosco", gastronomico: "Gastronómico", supermercado: "Autoservicio" };
const STATUS_TONE = { aprobado: "ok", pendiente: "warn", rechazado: "dark" } as const;

type Row = { id: string; name: string; kind: string; address: string; zone: string; status: keyof typeof STATUS_TONE; phone: string | null; cuit: string | null; created_at: string };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireRole(null, "/ventas/clientes");
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("customers").select("id, name, kind, address, zone, status, phone, cuit, created_at").order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query.returns<Row[]>();
  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pendiente");
  const canApprove = ["ventas", "admin"].includes(profile.role);
  return (
    <>
      <PageHeader title="Clientes" description={`${rows.filter((r) => r.status === "aprobado").length} comercios activos · ${pending.length} pendientes de aprobación.`} />
      {pending.length > 0 && (
        <Card className="mb-6 border-warn/40">
          <CardHeader title="Altas pendientes de aprobación" />
          <ul className="divide-y divide-lama-line">
            {pending.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-lama-steel">{KIND[c.kind]} · {c.address} · {c.phone ?? "sin teléfono"}{c.cuit ? ` · CUIT ${c.cuit}` : ""}</p>
                  <p className="text-xs text-lama-steel">Registrado el {formatDateTime(c.created_at)}</p>
                </div>
                {canApprove && <ApproveButtons customerId={c.id} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <form className="mb-4 flex max-w-md">
        <input name="q" defaultValue={q} placeholder="Buscar comercio" className="h-10 min-w-0 flex-1 rounded-l-[10px] border border-r-0 border-lama-line bg-white px-3 text-sm" />
        <button className="h-10 rounded-r-[10px] bg-lama-ink px-4 text-sm font-semibold text-white">Buscar</button>
      </form>
      <Card>
        <Table>
          <thead><tr><th>Comercio</th><th>Rubro</th><th>Zona</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.status !== "pendiente").map((c) => (
              <tr key={c.id}>
                <td><p className="font-medium">{c.name}</p><p className="text-xs text-lama-steel">{c.address}</p></td>
                <td>{KIND[c.kind]}</td>
                <td className="capitalize">{c.zone}</td>
                <td><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
