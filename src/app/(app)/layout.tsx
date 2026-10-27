import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { navForRole } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/types";
import { Shell } from "@/components/shell/Shell";
import { CartProvider } from "@/components/cart/CartProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/ingresar");
  const { profile, customer } = s;
  const pending = profile.role === "cliente" && customer?.status !== "aprobado";
  const nav = pending ? [{ href: "/en-revision", label: "Mi alta", icon: "store" as const }] : navForRole(profile.role);
  return (
    <CartProvider storageKey={`lama-cart-${profile.id}`}>
      <Shell nav={nav} userName={profile.full_name || profile.email || ""} roleLabel={ROLE_LABEL[profile.role]} context={customer?.name}>
        {children}
      </Shell>
    </CartProvider>
  );
}
