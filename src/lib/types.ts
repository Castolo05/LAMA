export type Role =
  | "admin"
  | "direccion"
  | "ventas"
  | "logistica"
  | "chofer"
  | "cliente"
  | "proveedor";

export type OrderStatus = "recibido" | "en_preparacion" | "preparado" | "en_reparto" | "entregado" | "con_novedad" | "anulado";
export type Channel = "portal" | "telefono";
export type ProductLine = "coca_cola" | "secos" | "frescos" | "congelados";
export type CustomerKind = "almacen" | "kiosco" | "gastronomico" | "supermercado";
export type TicketKind = "rotura" | "faltante" | "demora" | "consulta" | "otro";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string | null;
  customer_id: string | null;
  driver_id: string | null;
  supplier_id: string | null;
  is_owner: boolean;
  active: boolean;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category_id: string;
  supplier_id: string | null;
  needs_cold: boolean;
  price: number;
  cost: number;
  stock: number;
  weight_kg: number;
  volume_m3: number;
  unit: string;
  low_sugar: boolean;
  image_url: string | null;
  active: boolean;
  categories?: { name: string; line: ProductLine } | null;
};

export type Promo = { product_id: string; pct: number; starts_on: string; ends_on: string };

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  direccion: "Dirección",
  ventas: "Ventas, atención y cobranzas",
  logistica: "Logística y depósito",
  chofer: "Chofer",
  cliente: "Cliente",
  proveedor: "Proveedor",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  preparado: "Preparado",
  en_reparto: "En reparto",
  entregado: "Entregado",
  con_novedad: "Con novedad",
  anulado: "Anulado",
};

export const LINE_LABEL: Record<ProductLine, string> = {
  coca_cola: "Coca-Cola",
  secos: "Almacén",
  frescos: "Frescos",
  congelados: "Congelados",
};

export const CHANNEL_LABEL: Record<Channel, string> = { portal: "Portal web", telefono: "Teléfono" };
