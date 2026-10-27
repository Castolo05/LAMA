import { Badge } from "@/components/ui/Badge";
import { STATUS_LABEL, type OrderStatus } from "@/lib/types";

const TONE: Record<OrderStatus, "neutral" | "red" | "ok" | "warn" | "dark"> = {
  recibido: "neutral",
  en_preparacion: "warn",
  preparado: "warn",
  en_reparto: "red",
  entregado: "ok",
  con_novedad: "warn",
  anulado: "dark",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
