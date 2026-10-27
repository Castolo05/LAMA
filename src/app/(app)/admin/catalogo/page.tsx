import Link from "next/link";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { CatalogAdmin } from "./CatalogAdmin";

export const metadata = { title: "Catálogo" };

export default async function AdminCatalogoPage() {
  await requireRole(["admin"], "/admin/catalogo");
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, sku, name, brand, price, stock, active, categories(name)").order("sku");
  return (
    <>
      <PageHeader title="Catálogo maestro" description="Stock y productos activos. Los precios y promociones se gestionan desde Ventas." actions={<Link href="/ventas/precios" className="text-sm font-semibold text-lama-red">Ir a precios</Link>} />
      <CatalogAdmin products={(data ?? []) as never} />
    </>
  );
}
