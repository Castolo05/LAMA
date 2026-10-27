import Image from "next/image";
import Link from "next/link";
import { Isotipo } from "@/components/brand/Logo";
import credits from "@/lib/product-photo-credits.json";

export const metadata = { title: "Créditos de fotografías" };

export default function Creditos() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/" aria-label="Inicio"><Isotipo className="h-10 w-10" /></Link>
      <h1 className="energetic mt-6 text-3xl">Fotografías de productos</h1>
      <p className="mt-2 max-w-2xl text-sm text-lama-steel">
        Las fotos del catálogo son ilustrativas y provienen de Wikimedia Commons, con licencias abiertas. Cada una indica su autor y licencia.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {credits.map((c) => (
          <li key={c.file} className="flex gap-3 rounded-xl border border-lama-line bg-white p-3 text-sm">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-lama-cloud">
              <Image src={c.file} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <a href={c.page} className="font-semibold break-words hover:text-lama-red">{c.title}</a>
              <p className="text-lama-steel">
                {c.creator ? `${c.creator} · ` : ""}
                {c.licenseUrl ? <a href={c.licenseUrl} className="underline hover:text-lama-red">{c.license}</a> : c.license}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
