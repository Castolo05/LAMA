import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Isotipo } from "@/components/brand/Logo";
import { DeliveryCountdown } from "@/components/landing/DeliveryCountdown";
import { Reveal } from "@/components/landing/Reveal";
import { WeekRoutes } from "@/components/landing/WeekRoutes";
import { getSession } from "@/lib/session";
import { homeForRole } from "@/lib/nav";

const tile = "rounded-lg overflow-hidden";
const pad = "p-5 sm:p-6";

const PHOTOS = {
  piedra: { src: "/photos/piedra-movediza.webp", w: 1600, h: 1200, alt: "La réplica de la Piedra Movediza sobre el cerro, con Tandil de fondo" },
  deposito: { src: "/photos/deposito.webp", w: 1300, h: 683, alt: "Depósito con pallets de mercadería listos para despachar" },
  autoelevador: { src: "/photos/autoelevador.webp", w: 1024, h: 683, alt: "Autoelevador moviendo un pallet cargado en un depósito" },
  sifones: { src: "/photos/sifones.webp", w: 1596, h: 1600, alt: "Cajones de sifones de soda en una fotografía de archivo" },
  piedra1912: { src: "/photos/piedra-1912.webp", w: 1600, h: 1199, alt: "Los restos de la Piedra Movediza original, caída en 1912" },
};

const CREDITS = [
  "“Actual Piedra movediza”, Giselatini, CC BY-SA 4.0, Wikimedia Commons",
  "“Piedra movediza de Tandil caída en 1912”, Dario Alpern, CC BY-SA 3.0, Wikimedia Commons",
  "“Hungary Fortepan 89887”, Fortepan / Urbán Tamás, CC BY-SA 3.0, Wikimedia Commons",
  "“Shipment warehouse in action”, U.S. Department of Agriculture, CC0, rawpixel",
  "“Forklift operator shuttles pallet loaded”, CC0, rawpixel",
];

export default async function Home() {
  const s = await getSession();
  if (s) redirect(homeForRole(s.profile.role));

  return (
    <div className="bg-[#e7e9ed] p-2 text-lama-ink">
      <Reveal />

      {/* Fila superior del tablero */}
      <header className="grid grid-cols-[60px_1fr_auto] gap-2">
        <Link href="/" className={`${tile} flex h-[60px] items-center justify-center bg-lama-ink`} aria-label="Lama, inicio">
          <Isotipo className="h-8 w-8" />
        </Link>
        <nav className={`${tile} flex items-center gap-6 overflow-x-auto bg-lama-cloud px-5 text-sm font-semibold md:pl-[calc(50%-90px)]`} aria-label="Secciones">
          <a href="#lineas" className="whitespace-nowrap hover:text-lama-red">Productos</a>
          <a href="#como" className="whitespace-nowrap hover:text-lama-red">Cómo pedir</a>
          <a href="#reparto" className="whitespace-nowrap hover:text-lama-red">Reparto</a>
          <a href="#contacto" className="hidden whitespace-nowrap hover:text-lama-red sm:inline">Contacto</a>
        </nav>
        <Link href="/ingresar" className={`${tile} flex h-[60px] items-center bg-lama-ink px-5 font-display text-sm font-bold text-white transition-colors hover:bg-lama-red`}>
          Ingresar
        </Link>
      </header>

      {/* Portada: tablero de dos por dos */}
      <section className="mt-2 grid gap-2 md:h-[calc(100svh-84px)] md:min-h-[620px] md:grid-cols-2 md:grid-rows-2">
        <div className={`${tile} ${pad} flex min-h-[30svh] flex-col justify-end bg-white`}>
          <h1>
            <span className="energetic block text-[22vw] leading-[0.85] tracking-[-0.05em] md:text-[clamp(96px,12.5vw,190px)]">LAMA</span>
            <span className="mt-3 block font-display text-xl font-bold sm:text-2xl">Logística y Distribución</span>
          </h1>
        </div>
        <div className={`${tile} relative aspect-[4/3] md:aspect-auto`}>
          <Image src={PHOTOS.piedra.src} alt={PHOTOS.piedra.alt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="shutter object-cover grayscale" />
          <span className="absolute bottom-3 left-3 rounded-md bg-lama-ink/80 px-2.5 py-1 text-[13px] text-white">La Piedra Movediza, Tandil</span>
        </div>
        <div className={`${tile} relative hidden md:block`}>
          <Image src={PHOTOS.deposito.src} alt={PHOTOS.deposito.alt} fill sizes="50vw" className="object-cover grayscale" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`${tile} ${pad} bg-lama-ink text-white`}>
            <p className="text-base font-semibold leading-snug sm:text-lg lg:text-xl xl:text-2xl">
              Bebidas y alimentos para almacenes, kioscos y gastronomía de Tandil y la región.
            </p>
          </div>
          <Link href="/registro" className={`${tile} ${pad} group flex flex-col justify-between bg-lama-red text-white transition-colors hover:bg-lama-red-dark`}>
            <DeliveryCountdown />
            <span className="mt-6 inline-flex items-center gap-2 font-display text-sm font-bold">
              Registrar mi comercio
              <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden className="transition-transform group-hover:translate-x-1">
                <path d="M0 7h25M19 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" />
              </svg>
            </span>
          </Link>
        </div>
      </section>

      {/* Intro: quiénes, qué, dónde, cómo */}
      <section className={`${tile} mt-2 bg-white px-5 py-16 sm:px-10 md:py-24`}>
        <p data-reveal className="max-w-6xl text-[20px] leading-[1.25] md:text-[clamp(22px,2.2vw,32px)]">
          Somos el distribuidor oficial de Coca-Cola en Tandil y, en el mismo camión, te llevamos lácteos, quesos,
          fiambres, congelados y almacén. Ahora también podés ver la lista de precios del día, pedir desde el celular y
          saber a qué hora llega el reparto a tu local.
        </p>
        <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 md:mt-[72px] lg:grid-cols-4">
          {[
            ["Quiénes somos.", "Lama Logística y Distribución S.R.L., una empresa tandilense con flota propia de camiones de corto y mediano alcance, cámara de frío y depósito para secos y frescos en Figueroa 651."],
            ["Qué llevamos.", "La línea completa de The Coca-Cola Company (gaseosas, Cepita, Bonaqua, Kin, Monster), alimentos secos de góndola, lácteos, quesos y fiambres de la zona y congelados para gastronomía."],
            ["Dónde repartimos.", "Todo el partido de Tandil de lunes a sábado y las localidades de la región centro (Gardey, María Ignacia, Barker, De la Canal, Azucena y Fulton) en viajes programados."],
            ["Cómo pedir.", "Desde la web o por teléfono al (0249) 444-5001. Los dos caminos entran al mismo pedido y lo seguís desde tu cuenta."],
          ].map(([lead, text], i) => (
            <p key={lead} data-reveal style={{ transitionDelay: `${i * 80}ms` }} className="text-[15px] leading-[1.5] text-lama-steel">
              <strong className="font-semibold text-lama-ink">{lead}</strong> {text}
            </p>
          ))}
        </div>
      </section>

      {/* Líneas: una foto cortada en bultos */}
      <section id="lineas" className="mt-2 scroll-mt-2">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
          {Array.from({ length: 24 }).map((_, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const colour: Record<number, { cls: string; body: React.ReactNode }> = {
              0: { cls: "bg-lama-ink text-white col-span-2 sm:col-span-1", body: <h2 className="energetic text-[6vw] leading-none sm:text-[2.6vw]">Cuatro líneas, un pedido</h2> },
              8: { cls: "bg-lama-red text-white", body: <p className="text-[15px] font-semibold leading-snug sm:text-lg">Línea completa Coca-Cola, en todos los formatos</p> },
              13: { cls: "bg-white", body: <p className="text-[15px] font-semibold leading-snug sm:text-lg">Lácteos, quesos y salame tandilero</p> },
              17: { cls: "bg-lama-ink text-white", body: <p className="text-[15px] font-semibold leading-snug sm:text-lg">Congelados con cadena de frío hasta tu heladera</p> },
              22: { cls: "bg-lama-red text-white", body: <Link href="/ingresar" className="font-display text-base font-bold underline-offset-4 hover:underline sm:text-lg">Ver catálogo y precios</Link> },
            };
            const c = colour[i];
            if (c) {
              return (
                <div key={i} data-reveal className={`${tile} ${c.cls} flex aspect-square flex-col justify-between p-3 sm:p-4 ${i === 0 ? "aspect-auto sm:aspect-square" : ""}`}>
                  {c.body}
                </div>
              );
            }
            return (
              <div key={i} className={`${tile} group aspect-square ${i >= 18 ? "hidden sm:block" : ""}`} aria-hidden>
                <div
                  className="h-full w-full bg-no-repeat grayscale transition-transform duration-500 group-hover:scale-[1.08]"
                  style={{ backgroundImage: `url(${PHOTOS.sifones.src})`, backgroundSize: "600% 400%", backgroundPosition: `${col * 20}% ${row * 33.33}%` }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Cómo pedir: bultos que crecen */}
      <section id="como" className={`${tile} mt-2 scroll-mt-2 bg-white px-5 py-16 sm:px-10 md:py-24`}>
        <div className="grid gap-7 md:grid-cols-12 md:items-end md:gap-2.5">
          <div className="md:col-span-7 md:col-start-1 md:row-start-1 md:self-start">
            <h2 data-reveal className="energetic text-[30px] leading-tight md:text-[clamp(40px,3.6vw,52px)]">De tu celular a tu góndola</h2>
          </div>
          {[
            {
              span: "md:col-span-3", h: "h-[34vw] md:h-[30vh]", bg: "bg-lama-cloud", name: "Pedís", text: "Elegís del catálogo con el precio del día o repetís tu último pedido en un toque.",
              body: (
                <div data-ui className="mx-auto mt-4 w-[78%] max-w-[230px] rounded-xl bg-white p-3 text-[13px]">
                  <p className="font-display font-bold">Tu pedido</p>
                  {[["Coca-Cola 2,25 L × 6", "4"], ["Leche entera × 12", "2"], ["Salame tandilero", "3"]].map(([n, q]) => (
                    <p key={n} className="mt-1.5 flex justify-between gap-2"><span className="truncate">{n}</span><span className="font-semibold">{q}</span></p>
                  ))}
                  <p className="mt-2 rounded-md bg-lama-red py-1.5 text-center font-display font-bold text-white">Confirmar</p>
                </div>
              ),
            },
            {
              span: "md:col-span-4", h: "h-[46vw] md:h-[44vh]", bg: "bg-lama-ink", name: "Preparamos", text: "Depósito arma tu pedido separando secos, frescos y frío. Si falta algo, te avisamos antes de salir.",
              body: <Image src={PHOTOS.autoelevador.src} alt={PHOTOS.autoelevador.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover grayscale" />,
            },
            {
              span: "md:col-span-5", h: "h-[62vw] md:h-[60vh]", bg: "bg-lama-red", name: "Llega", text: "Ves el camión en el mapa y la hora estimada de llegada a tu local. El chofer confirma la entrega en el momento.",
              body: (
                <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-label="Recorrido de un camión de reparto por Tandil" role="img">
                  <rect width="400" height="300" fill="#DA2128" />
                  {[60, 120, 180, 240].map((y) => <path key={y} d={`M0 ${y} H400`} stroke="#c51b22" strokeWidth="14" />)}
                  {[70, 150, 230, 310].map((x) => <path key={x} d={`M${x} 0 V300`} stroke="#c51b22" strokeWidth="14" />)}
                  <path d="M30 270 L70 270 L70 180 L150 180 L150 120 L230 120 L230 60 L310 60" fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" strokeDasharray="2 12" strokeLinecap="round" />
                  {[[70, 180], [150, 120], [230, 60]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="9" fill="#1A1A1A" stroke="#fff" strokeWidth="3" />)}
                  <circle cx="310" cy="60" r="13" fill="#fff" />
                  <g transform="translate(118 158)" className="truck-drive">
                    <rect x="0" y="0" width="38" height="22" rx="3" fill="#1A1A1A" />
                    <rect x="38" y="7" width="15" height="15" rx="2" fill="#1A1A1A" />
                    <circle cx="10" cy="25" r="5" fill="#fff" /><circle cx="43" cy="25" r="5" fill="#fff" />
                  </g>
                </svg>
              ),
            },
          ].map((st, i) => (
            <div key={st.name} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className={`${st.span} md:row-start-2`}>
              <div className={`${tile} relative ${st.h} ${st.bg}`}>{st.body}</div>
              <h3 className="mt-4 font-display text-xl font-bold">{st.name}</h3>
              <p className="mt-1 max-w-sm text-base text-lama-steel">{st.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reparto de la semana */}
      <section id="reparto" className={`${tile} mt-2 scroll-mt-2 bg-lama-cloud px-5 py-16 sm:px-10 md:py-24`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 data-reveal className="text-[clamp(32px,4vw,60px)] font-bold leading-[1.05] tracking-tight">
            <span className="block text-lama-steel">Pasamos por tu zona</span>
            <span className="energetic block">todas las semanas</span>
          </h2>
          <Link href="/registro" className="inline-flex h-12 items-center justify-center rounded-lg bg-lama-red px-6 font-display text-sm font-bold text-white transition-colors hover:bg-lama-red-dark">
            Quiero que me visiten
          </Link>
        </div>
        <WeekRoutes />
      </section>

      {/* Contacto */}
      <section id="contacto" className={`${tile} mt-2 scroll-mt-2 overflow-hidden bg-lama-red pt-12 pb-16 text-white md:min-h-[80svh]`}>
        <div className="marquee flex w-max gap-2" aria-hidden>
          {[...Object.values(PHOTOS), ...Object.values(PHOTOS)].map((p, i) => (
            <div key={i} className={`relative h-[110px] shrink-0 overflow-hidden rounded-lg md:h-[150px] ${["aspect-[3/4]", "aspect-square", "aspect-[3/2]"][i % 3]}`}>
              <Image src={p.src} alt="" fill sizes="240px" className="object-cover grayscale" />
            </div>
          ))}
        </div>
        <div className="px-5 sm:px-10">
          <h2 data-reveal className="energetic mt-14 text-[9vw] leading-none md:mt-[72px] md:text-[clamp(36px,4vw,60px)]">Sumá tu comercio</h2>
          <form action="/registro" method="get" className="mt-10 grid gap-2 md:grid-cols-3">
            <label className="sr-only" htmlFor="c-nombre">Nombre del comercio</label>
            <input id="c-nombre" name="nombre" placeholder="Nombre del comercio" className="h-[60px] rounded-lg bg-[#c41a21] px-5 text-lg text-white placeholder:text-white/80 focus:bg-white focus:text-lama-ink focus:outline-none md:h-24 md:text-center" />
            <label className="sr-only" htmlFor="c-email">Email</label>
            <input id="c-email" name="email" type="email" placeholder="Email" className="h-[60px] rounded-lg bg-[#c41a21] px-5 text-lg text-white placeholder:text-white/80 focus:bg-white focus:text-lama-ink focus:outline-none md:h-24 md:text-center" />
            <button className="h-[60px] rounded-lg bg-lama-ink font-display text-lg font-bold transition-colors hover:bg-black md:h-24">Registrar mi comercio</button>
          </form>
          <div className="mt-3 grid gap-2 text-[13px] text-white/90 md:grid-cols-3">
            <p>Ventas revisa cada alta y te habilita en el día.</p>
            <p className="md:col-start-3">¿Preferís hablar? (0249) 444-5001 · +54 249 445-1556</p>
          </div>
        </div>
      </section>

      {/* Pie de tablero */}
      <footer className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-12">
        <div className={`${tile} col-span-2 flex h-40 items-center justify-center bg-lama-ink md:order-5 md:col-span-8 md:h-80`}>
          <span className="energetic text-[18vw] leading-none text-white md:text-[9vw]">LAMA</span>
        </div>
        <Link href="/ingresar" className={`${tile} ${pad} group col-span-2 flex h-40 flex-col justify-between bg-lama-red text-white md:order-6 md:col-span-4 md:h-80`}>
          <span className="font-display text-[28px] font-bold leading-tight">Entrá a tu cuenta</span>
          <svg width="56" height="28" viewBox="0 0 56 28" aria-hidden className="self-end transition-transform group-hover:translate-x-1">
            <path d="M0 14h50M38 2l12 12-12 12" fill="none" stroke="currentColor" strokeWidth="4" />
          </svg>
        </Link>
        <nav className={`${tile} ${pad} bg-white md:order-2 md:col-span-3 md:h-[220px]`} aria-label="Pie">
          <ul className="space-y-1.5 text-base">
            <li><a href="#lineas" className="hover:text-lama-red">Productos</a></li>
            <li><a href="#como" className="hover:text-lama-red">Cómo pedir</a></li>
            <li><a href="#reparto" className="hover:text-lama-red">Reparto</a></li>
            <li><Link href="/registro" className="hover:text-lama-red">Registrar mi comercio</Link></li>
          </ul>
        </nav>
        <a href="mailto:lama1@speedy.com.ar" className={`${tile} ${pad} flex flex-col justify-end bg-white text-lg font-semibold hover:text-lama-red md:order-4 md:col-span-3 md:h-[220px] md:text-xl`}>
          lama1@speedy.com.ar
        </a>
        <div className={`${tile} ${pad} bg-white md:order-3 md:col-span-2 md:h-[220px]`}>
          <p className="font-display text-lg font-bold">Tandil</p>
          <p className="mt-1 text-base">Figueroa 651</p>
          <p className="text-base">Lun a sáb, 7 a 18 h</p>
        </div>
        <div className={`${tile} ${pad} col-span-2 flex flex-col justify-between bg-white md:order-1 md:col-span-4 md:h-[220px]`}>
          <p className="text-xl font-semibold leading-snug md:text-2xl">Distribución mayorista para el comercio de la región centro.</p>
          <p className="mt-4 text-[13px] text-lama-steel">
            © {new Date().getFullYear()} Lama Logística y Distribución S.R.L.
          </p>
        </div>
      </footer>
      <p className="px-3 py-4 text-[13px] text-lama-steel">Fotografías: {CREDITS.join(" · ")}. <Link href="/creditos" className="underline hover:text-lama-red">Fotos de productos</Link>.</p>
    </div>
  );
}
