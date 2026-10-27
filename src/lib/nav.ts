import type { Role } from "./types";

export type NavIcon =
  | "home" | "catalog" | "cart" | "orders" | "tickets" | "account" | "store" | "customers" | "phone"
  | "prices" | "warehouse" | "planner" | "routes" | "fleet" | "driver" | "collections" | "bi" | "supplier"
  | "users" | "settings" | "audit";

export type NavItem = { href: string; label: string; icon: NavIcon };

const I = {
  inicio: { href: "/inicio", label: "Inicio", icon: "home" },
  catalogo: { href: "/catalogo", label: "Catálogo", icon: "catalog" },
  carrito: { href: "/carrito", label: "Carrito", icon: "cart" },
  pedidos: { href: "/pedidos", label: "Pedidos", icon: "orders" },
  reclamos: { href: "/reclamos", label: "Reclamos", icon: "tickets" },
  cuenta: { href: "/cuenta", label: "Cuenta", icon: "account" },
  miComercio: { href: "/mi-comercio", label: "Mi comercio", icon: "store" },
  ventasClientes: { href: "/ventas/clientes", label: "Clientes", icon: "customers" },
  ventasReclamos: { href: "/ventas/reclamos", label: "Reclamos", icon: "tickets" },
  ventasTel: { href: "/ventas/pedido-telefonico", label: "Pedido telefónico", icon: "phone" },
  ventasPrecios: { href: "/ventas/precios", label: "Precios y promos", icon: "prices" },
  deposito: { href: "/deposito", label: "Depósito", icon: "warehouse" },
  planificador: { href: "/logistica/planificador", label: "Planificador", icon: "planner" },
  rutas: { href: "/logistica/rutas", label: "Rutas del día", icon: "routes" },
  flota: { href: "/flota", label: "Flota", icon: "fleet" },
  chofer: { href: "/chofer", label: "Mi ruta", icon: "driver" },
  cobranzas: { href: "/cobranzas", label: "Cobranzas", icon: "collections" },
  bi: { href: "/bi", label: "Tableros", icon: "bi" },
  proveedor: { href: "/proveedor", label: "Mis informes", icon: "supplier" },
  usuarios: { href: "/admin/usuarios", label: "Usuarios", icon: "users" },
  catalogoAdmin: { href: "/admin/catalogo", label: "Catálogo", icon: "catalog" },
  parametros: { href: "/admin/parametros", label: "Parámetros", icon: "settings" },
  auditoria: { href: "/admin/auditoria", label: "Auditoría", icon: "audit" },
} satisfies Record<string, NavItem>;

const NAV: Record<Role, NavItem[]> = {
  cliente: [I.inicio, I.catalogo, I.carrito, I.pedidos, I.reclamos, I.cuenta, I.miComercio],
  ventas: [I.pedidos, I.ventasClientes, I.ventasReclamos, I.ventasTel, I.ventasPrecios, I.cobranzas, I.bi],
  logistica: [I.deposito, I.planificador, I.rutas, I.flota, I.bi],
  chofer: [I.chofer],
  direccion: [I.bi, I.pedidos, I.ventasClientes, I.rutas, I.flota, I.cobranzas, I.auditoria],
  proveedor: [I.proveedor],
  admin: [I.bi, I.pedidos, I.ventasClientes, I.ventasReclamos, I.deposito, I.planificador, I.rutas, I.flota, I.cobranzas,
    I.usuarios, I.catalogoAdmin, I.parametros, I.auditoria],
};

export function navForRole(role: Role): NavItem[] {
  return NAV[role];
}

export function homeForRole(role: Role): string {
  return NAV[role][0].href;
}

export function canAccess(role: Role, path: string): boolean {
  if (path === "/inicio" || path === "/perfil") return true;
  return NAV[role].some((i) => path === i.href || path.startsWith(i.href + "/"));
}
