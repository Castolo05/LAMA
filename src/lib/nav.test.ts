import { describe, expect, it } from "vitest";
import { canAccess, homeForRole, navForRole } from "./nav";

const hrefs = (role: Parameters<typeof navForRole>[0]) => navForRole(role).map((i) => i.href);

describe("navForRole", () => {
  it("cliente ve catálogo, pedidos, reclamos y cuenta, pero no BI", () => {
    const h = hrefs("cliente");
    expect(h).toEqual(expect.arrayContaining(["/catalogo", "/pedidos", "/reclamos", "/cuenta"]));
    expect(h).not.toContain("/bi");
  });
  it("proveedor solo ve su portal", () => {
    expect(hrefs("proveedor")).toEqual(["/proveedor"]);
  });
  it("chofer solo ve su hoja de ruta", () => {
    expect(hrefs("chofer")).toEqual(["/chofer"]);
  });
  it("dirección ve BI y auditoría pero no gestiona usuarios", () => {
    const h = hrefs("direccion");
    expect(h).toEqual(expect.arrayContaining(["/bi", "/admin/auditoria"]));
    expect(h).not.toContain("/admin/usuarios");
  });
  it("logística también prepara pedidos en depósito", () => {
    expect(hrefs("logistica")).toEqual(expect.arrayContaining(["/deposito", "/logistica/planificador", "/logistica/rutas", "/flota"]));
  });
  it("ventas también atiende reclamos y gestiona cobranzas", () => {
    expect(hrefs("ventas")).toEqual(expect.arrayContaining(["/ventas/clientes", "/ventas/reclamos", "/cobranzas"]));
  });
  it("admin gestiona usuarios", () => {
    expect(hrefs("admin")).toContain("/admin/usuarios");
  });
});

describe("canAccess", () => {
  it("permite subrutas de un módulo habilitado", () => {
    expect(canAccess("cliente", "/pedidos/123")).toBe(true);
  });
  it("bloquea módulos de otro rol", () => {
    expect(canAccess("cliente", "/bi")).toBe(false);
    expect(canAccess("proveedor", "/pedidos")).toBe(false);
    expect(canAccess("chofer", "/deposito")).toBe(false);
  });
  it("todos pueden ver /inicio", () => {
    expect(canAccess("proveedor", "/inicio")).toBe(true);
  });
});

describe("homeForRole", () => {
  it("lleva a cada rol a su pantalla principal", () => {
    expect(homeForRole("chofer")).toBe("/chofer");
    expect(homeForRole("proveedor")).toBe("/proveedor");
    expect(homeForRole("cliente")).toBe("/inicio");
  });
});
