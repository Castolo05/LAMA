import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getCatalog } from "@/lib/server/catalog";
import { todayBA } from "@/lib/delivery";
import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Carrito" };

export default async function CarritoPage() {
  const { profile } = await requireRole(["cliente"], "/carrito");
  const { products, promos } = await getCatalog();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Tu pedido" description="Revisá las cantidades y confirmá. Te avisamos si al preparar falta algo." />
      <CartView
        products={products}
        promos={promos}
        today={todayBA()}
        customerId={profile.customer_id!}
        channel="portal"
        emptyHint={<>Agregá productos desde el <Link href="/catalogo" className="font-semibold text-lama-red">catálogo</Link> o repetí tu último pedido desde el inicio.</>}
      />
    </div>
  );
}
