"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS } from "./icons";
import { Isotipo } from "@/components/brand/Logo";
import { logout } from "@/app/ingresar/actions";
import { useCart } from "@/components/cart/CartProvider";

type Props = { nav: NavItem[]; userName: string; roleLabel: string; context?: string; children: React.ReactNode };

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

function CartCount({ href }: { href: string }) {
  const { count } = useCart();
  if (href !== "/carrito" || count === 0) return null;
  return <span className="ml-auto rounded-full bg-lama-red px-1.5 text-[11px] font-bold leading-5 text-white">{count}</span>;
}

export function Shell({ nav, userName, roleLabel, context, children }: Props) {
  const path = usePathname();
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-lama-ink text-white lg:flex">
        <Link href={nav[0].href} className="flex items-center gap-2.5 px-6 pt-6 pb-8">
          <Isotipo className="h-8 w-8" />
          <span className="leading-tight">
            <span className="energetic block text-2xl">LAMA</span>
            <span className="block text-[11px] text-white/60">Logística y Distribución</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Principal">
          {nav.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = isActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-1 -skew-y-12 rounded-full bg-lama-red" />}
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
                <CartCount href={item.href} />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="truncate text-xs text-white/60">{context ?? roleLabel}</p>
          <form action={logout} className="mt-3">
            <button className="flex items-center gap-2 text-xs text-white/70 hover:text-white">
              <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Encabezado (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-lama-line bg-white px-4 py-3 lg:hidden">
        <Link href={nav[0].href} className="flex items-center gap-2">
          <Isotipo className="h-7 w-7" />
          <span className="energetic text-xl">LAMA</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="max-w-[45vw] text-right leading-tight">
            <p className="truncate text-xs font-semibold">{userName}</p>
            <p className="truncate text-[11px] text-lama-steel">{context ?? roleLabel}</p>
          </div>
          <form action={logout}>
            <button aria-label="Cerrar sesión" className="rounded-lg p-2 text-lama-steel hover:bg-lama-cloud">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>

      {/* Navegación inferior (celular) */}
      {nav.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-lama-line bg-white lg:hidden" aria-label="Principal">
          <div className="flex overflow-x-auto px-1 pb-[env(safe-area-inset-bottom)]">
            {nav.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(path, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium",
                    active ? "text-lama-red" : "text-lama-steel",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.href === "/carrito" && <MobileCartDot />}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function MobileCartDot() {
  const { count } = useCart();
  if (count === 0) return null;
  return (
    <span className="absolute top-1.5 right-[calc(50%-1.1rem)] rounded-full bg-lama-red px-1 text-[10px] font-bold leading-4 text-white">
      {count}
    </span>
  );
}
