import { Clock } from "lucide-react";
import { requireRole } from "@/lib/session";
import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/nav";

export default async function EnRevisionPage() {
  const { profile, customer } = await requireRole(null, "/en-revision");
  if (profile.role !== "cliente" || customer?.status === "aprobado") redirect(homeForRole(profile.role));
  const rejected = customer?.status === "rechazado";
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-lama-line bg-white p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn">
        <Clock className="h-6 w-6" />
      </span>
      <h1 className="energetic mt-4 text-2xl">{rejected ? "No pudimos aprobar el alta" : "Estamos revisando tu alta"}</h1>
      <p className="mt-2 text-sm text-lama-steel">
        {rejected
          ? "Tu comercio está fuera de nuestra zona de reparto o faltan datos. Llamanos al (0249) 444-5001 y lo vemos juntos."
          : `Recibimos los datos de ${customer?.name ?? "tu comercio"}. Ventas confirma que esté dentro de la zona de reparto y te habilita para ver precios y hacer pedidos.`}
      </p>
      {customer && <p className="mt-4 text-xs text-lama-steel">Dirección registrada: {customer.address}</p>}
    </div>
  );
}
