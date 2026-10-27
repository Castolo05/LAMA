import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { Select } from "@/components/ui/Input";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { demoLogin } from "./actions";
import { DemoButton } from "./DemoButton";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-lama-ink lg:block">
        <div className="absolute -left-24 top-0 h-full w-[70%] -skew-x-12 bg-lama-red" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/" className="font-display text-sm font-semibold text-white/80 hover:text-white">
            ← Volver al sitio
          </Link>
          <div>
            <p className="energetic max-w-md text-5xl leading-[1.05]">Tu pedido, tu camión y tu cuenta en un solo lugar.</p>
            <p className="mt-5 max-w-sm text-white/80">
              Precios del día, pedidos en minutos y la hora estimada de llegada a tu local.
            </p>
          </div>
          <p className="text-sm text-white/60">Figueroa 651, Tandil · (0249) 444-5001</p>
        </div>
      </section>

      <section className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" aria-label="Inicio">
            <Logo className="h-20 w-auto sm:h-24" />
          </Link>
          <h1 className="energetic mt-8 text-3xl">Ingresar</h1>
          <p className="mt-1 text-sm text-lama-steel">
            ¿Tu comercio todavía no tiene usuario?{" "}
            <Link href="/registro" className="font-semibold text-lama-red hover:underline">
              Registralo acá
            </Link>
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>

          <div className="mt-10 rounded-xl border border-lama-line bg-lama-cloud p-4">
            <h2 className="text-sm font-bold">Cuentas de demostración</h2>
            <p className="mt-0.5 text-xs text-lama-steel">Elegí un rol para ver la plataforma desde su perspectiva.</p>
            <form action={demoLogin} className="mt-3 flex gap-2">
              <Select name="email" aria-label="Cuenta de demostración" defaultValue={DEMO_ACCOUNTS[0].email}>
                {DEMO_ACCOUNTS.map((a) => (
                  <option key={a.email} value={a.email}>
                    {a.label} — {a.person}
                  </option>
                ))}
              </Select>
              <DemoButton />
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
