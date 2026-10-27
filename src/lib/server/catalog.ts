import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product, Promo } from "@/lib/types";

export async function getCatalog() {
  const supabase = await createClient();
  const [{ data: products }, { data: promos }] = await Promise.all([
    supabase.from("products").select("*, categories(name, line)").eq("active", true).order("sku"),
    supabase.from("promotions").select("product_id, pct, starts_on, ends_on"),
  ]);
  return { products: (products ?? []) as Product[], promos: (promos ?? []) as Promo[] };
}
