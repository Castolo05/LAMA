import Link from "next/link";
import { Isotipo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Isotipo className="h-12 w-12" />
      <h1 className="energetic text-3xl">No encontramos esta página</h1>
      <p className="max-w-sm text-sm text-lama-steel">El enlace no existe o no tenés acceso a ese contenido con tu usuario.</p>
      <Link href="/ingresar" className="rounded-[10px] bg-lama-red px-5 py-3 font-display text-sm font-bold text-white hover:bg-lama-red-dark">Volver al inicio</Link>
    </main>
  );
}
