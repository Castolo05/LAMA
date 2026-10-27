import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayBA } from "@/lib/delivery";
import { PageHeader } from "@/components/ui/PageHeader";
import { PriceEditor } from "./PriceEditor";

export const metadata = { title: "Precios y promociones" };

export default async function PreciosPage() {
  await requireRole(["ventas", "admin"], "/ventas/precios");
  const supabase = await createClient();
  const [{ data: products }, { data: promos }] = await Promise.all([
    supabase.from("products").select("id, sku, name, brand, price, cost, stock").eq("active", true).order("sku"),
    supabase.from("promotions").select("id, product_id, pct, starts_on, ends_on").order("ends_on", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader title="Precios y promociones" description="Los cambios se ven al instante en el portal y en la preventa. Cada cambio de precio queda en la auditoría." />
      <PriceEditor products={products ?? []} promos={promos ?? []} today={todayBA()} />
    </>
  );
}
