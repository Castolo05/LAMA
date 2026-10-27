import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Registrar mi comercio" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ nombre?: string; email?: string }> }) {
  const { nombre, email } = await searchParams;
  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-lg">
        <Link href="/" aria-label="Inicio">
          <Logo className="h-11 w-auto" />
        </Link>
        <h1 className="energetic mt-8 text-3xl">Registrar mi comercio</h1>
        <p className="mt-1 text-sm text-lama-steel">
          ¿Ya tenés usuario?{" "}
          <Link href="/ingresar" className="font-semibold text-lama-red hover:underline">
            Ingresá
          </Link>
        </p>
        <div className="mt-8 rounded-xl border border-lama-line bg-white p-5 sm:p-7">
          <RegisterForm defaultName={nombre} defaultEmail={email} />
        </div>
      </div>
    </main>
  );
}
