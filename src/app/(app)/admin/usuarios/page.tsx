import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserAdmin } from "./UserAdmin";

export const metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  await requireRole(["admin"], "/admin/usuarios");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email, role, active, customers!profiles_customer_fk(name)").order("role").order("full_name");
  return (
    <>
      <PageHeader title="Usuarios y roles" description="Cada cambio de rol, alta o baja queda registrado en la auditoría." />
      <UserAdmin users={(data ?? []) as never} />
    </>
  );
}
