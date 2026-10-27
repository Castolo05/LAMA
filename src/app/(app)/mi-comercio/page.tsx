import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmployeeForm } from "./EmployeeForm";

export const metadata = { title: "Mi comercio" };

const KIND: Record<string, string> = { almacen: "Almacén", kiosco: "Kiosco", gastronomico: "Gastronómico", supermercado: "Autoservicio" };

export default async function MiComercioPage() {
  const { profile, customer } = await requireRole(["cliente"], "/mi-comercio");
  const supabase = await createClient();
  const [{ data: c }, { data: people }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", customer!.id).single(),
    supabase.from("profiles").select("id, full_name, email, is_owner").eq("customer_id", customer!.id).order("is_owner", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Mi comercio" description="Datos de entrega y usuarios que pueden pedir en nombre del comercio." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={c?.name} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 p-5 text-sm">
            <dt className="text-lama-steel">Rubro</dt><dd>{KIND[c?.kind] ?? c?.kind}</dd>
            <dt className="text-lama-steel">Dirección</dt><dd>{c?.address}</dd>
            <dt className="text-lama-steel">Teléfono</dt><dd>{c?.phone ?? "—"}</dd>
            <dt className="text-lama-steel">CUIT</dt><dd>{c?.cuit ?? "—"}</dd>
            <dt className="text-lama-steel">Plazo de pago</dt><dd>{c?.payment_terms_days} días</dd>
          </dl>
          <p className="border-t border-lama-line px-5 py-3 text-xs text-lama-steel">Para cambiar estos datos, escribinos desde Reclamos y contacto.</p>
        </Card>
        <Card>
          <CardHeader title="Usuarios del comercio" />
          <ul className="divide-y divide-lama-line">
            {(people ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span><span className="block font-medium">{p.full_name}</span><span className="text-xs text-lama-steel">{p.email}</span></span>
                <Badge tone={p.is_owner ? "dark" : "neutral"}>{p.is_owner ? "Titular" : "Empleado"}</Badge>
              </li>
            ))}
          </ul>
          {profile.is_owner && (
            <div className="border-t border-lama-line p-5">
              <h3 className="mb-3 text-sm font-bold">Agregar empleado</h3>
              <EmployeeForm />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
