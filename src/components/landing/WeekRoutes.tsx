"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Band = { time: string; zone: string; note: string; truck: string };
const CITY: Band[] = [
  { time: "07:30", zone: "Microcentro", note: "Antes de las 10 h, por la ventana de descarga del centro", truck: "Camiones 01 y 02" },
  { time: "10:00", zone: "Barrios norte y Movediza", note: "La Movediza, Villa Italia, Lourdes", truck: "Camión 03" },
  { time: "10:30", zone: "Barrios sur y Cerro", note: "Villa Aguirre, San Cayetano, Cerro Leones", truck: "Camiones 04 y 05" },
];
const DAYS: { key: string; label: string; bands: Band[] }[] = [
  { key: "lun", label: "Lunes", bands: CITY },
  { key: "mar", label: "Martes", bands: [...CITY, { time: "13:00", zone: "Gardey y María Ignacia", note: "Viaje consolidado por ruta 74 y 30", truck: "Camión 02" }] },
  { key: "mie", label: "Miércoles", bands: CITY },
  { key: "jue", label: "Jueves", bands: [...CITY, { time: "13:00", zone: "De la Canal y Azucena", note: "Sale cuando la carga justifica el viaje", truck: "Camión 03" }] },
  { key: "vie", label: "Viernes", bands: [...CITY, { time: "13:00", zone: "Barker, Villa Cacique y Fulton", note: "Viaje consolidado por ruta 74 y 80", truck: "Camión 02" }] },
  { key: "sab", label: "Sábado", bands: CITY.slice(0, 2) },
];

export function WeekRoutes() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const d = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Argentina/Buenos_Aires" });
    const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d);
    if (idx >= 0) setActive(idx);
  }, []);
  const day = DAYS[active];
  return (
    <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-[150px_1fr] md:gap-10">
      <div role="tablist" aria-label="Día de reparto" className="flex gap-1.5 overflow-x-auto md:flex-col">
        {DAYS.map((d, i) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "h-14 min-w-[6.5rem] shrink-0 rounded-lg px-4 text-left font-display text-base font-bold transition-colors md:h-16 md:w-[150px]",
              i === active ? "bg-lama-ink text-white" : "bg-white text-lama-ink hover:bg-lama-red-soft",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <ul role="tabpanel" aria-label={`Reparto del ${day.label.toLowerCase()}`} className="space-y-1">
        {day.bands.map((b, i) => (
          <li
            key={b.zone}
            className={cn(
              "grid gap-1 rounded-lg px-5 py-4 sm:grid-cols-[80px_1fr_auto] sm:items-center sm:gap-6",
              i % 2 ? "bg-white" : "bg-[#eceef1]",
            )}
          >
            <span className="font-display text-xl font-bold tabular-nums">{b.time}</span>
            <span>
              <span className="block text-lg font-semibold">{b.zone}</span>
              <span className="block text-sm text-lama-steel">{b.note}</span>
            </span>
            <span className="text-sm text-lama-ink sm:text-right">{b.truck}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
