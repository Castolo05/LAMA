import type { Role } from "./types";

// Cuentas de demostración (creadas por supabase/seed). Uso exclusivo para la demo.
export const DEMO_PASSWORD = "DemoLama2026!";

export type DemoAccount = { role: Role; email: string; label: string; person: string };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "cliente", email: "cliente@demo.lama.com.ar", label: "Cliente", person: "Almacén Don Tito" },
  { role: "cliente", email: "cliente2@demo.lama.com.ar", label: "Cliente 2", person: "Kiosco La Esquina" },
  { role: "preventista", email: "preventista@demo.lama.com.ar", label: "Preventista", person: "Martín Godoy" },
  { role: "ventas", email: "ventas@demo.lama.com.ar", label: "Ventas y atención", person: "Laura Pereyra" },
  { role: "deposito", email: "deposito@demo.lama.com.ar", label: "Depósito", person: "Hugo Benítez" },
  { role: "logistica", email: "logistica@demo.lama.com.ar", label: "Logística", person: "Sergio Ramos" },
  { role: "chofer", email: "chofer@demo.lama.com.ar", label: "Chofer", person: "Carlos Medina" },
  { role: "cobranzas", email: "cobranzas@demo.lama.com.ar", label: "Cobranzas", person: "Gabriela Sosa" },
  { role: "direccion", email: "direccion@demo.lama.com.ar", label: "Dirección", person: "Ricardo Lama" },
  { role: "proveedor", email: "proveedor@demo.lama.com.ar", label: "Proveedor", person: "Coca-Cola FEMSA" },
  { role: "admin", email: "admin@demo.lama.com.ar", label: "Administrador", person: "Soporte TI" },
];
