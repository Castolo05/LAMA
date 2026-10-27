import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getCatalog } from "@/lib/server/catalog";
import { todayBA } from "@/lib/delivery";
import { ProductCatalog } from "@/components/catalog/ProductCatalog";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Catálogo" };

export default async function CatalogoPage() {
  const { profile } = await requireRole(null, "/catalogo");
  const { products, promos } = await getCatalog();
  const isClient = profile.role === "cliente";
  return (
    <>
      <PageHeader
        title="Catálogo y precios del día"
        description="Precios mayoristas con IVA incluido, actualizados hoy. Los productos con copo de nieve viajan en cámara de frío."
        actions={isClient && <Link href="/carrito" className={buttonClass("primary")}>Ver carrito</Link>}
      />
      <ProductCatalog products={products} promos={promos} today={todayBA()} readOnly={!isClient} />
    </>
  );
}
