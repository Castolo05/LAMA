import type { Role } from "./types";

// Cuentas de demostración (creadas por supabase/seed). Uso exclusivo para la demo.
export const DEMO_PASSWORD = "DemoLama2026!";

export type DemoAccount = { role: Role; email: string; label: string; person: string };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "cliente", email: "cliente@demo.lama.com.ar", label: "Cliente", person: "Almacén Don Tito" },
  { role: "ventas", email: "ventas@demo.lama.com.ar", label: "Ventas, atención y cobranzas", person: "Laura Pereyra" },
  { role: "logistica", email: "logistica@demo.lama.com.ar", label: "Logística y depósito", person: "Sergio Ramos" },
  { role: "chofer", email: "chofer@demo.lama.com.ar", label: "Chofer", person: "Carlos Medina" },
  { role: "direccion", email: "direccion@demo.lama.com.ar", label: "Dirección", person: "Ricardo Lama" },
  { role: "proveedor", email: "proveedor@demo.lama.com.ar", label: "Proveedor", person: "Coca-Cola FEMSA" },
  { role: "admin", email: "admin@demo.lama.com.ar", label: "Administrador", person: "Soporte TI" },
];
