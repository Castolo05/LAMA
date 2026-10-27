import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Parámetros" };

export default async function ParametrosPage() {
  await requireRole(["admin"], "/admin/parametros");
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  return (
    <>
      <PageHeader title="Parámetros" description="Valores que usan el planificador de rutas, los tableros y la toma de pedidos." />
      <SettingsForm settings={(data ?? []).map((s) => ({ key: s.key, value: Number(s.value) }))} />
    </>
  );
}
