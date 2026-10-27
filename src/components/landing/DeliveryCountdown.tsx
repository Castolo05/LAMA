"use client";

import { useEffect, useState } from "react";
import { CUTOFF_HOUR, baParts, formatDeliveryDay, nextDeliveryDate } from "@/lib/delivery";

function untilCutoff(now: Date): { h: number; m: number } | null {
  const { hour } = baParts(now);
  if (hour >= CUTOFF_HOUR) return null;
  const minutes = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", minute: "2-digit" }).format(now);
  const left = (CUTOFF_HOUR - hour) * 60 - Number(minutes);
  return { h: Math.floor(left / 60), m: left % 60 };
}

/** Lo interactivo de la portada: qué día llega un pedido hecho ahora, según la hora de Tandil. */
export function DeliveryCountdown() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <p className="text-base font-semibold leading-snug sm:text-lg lg:text-xl xl:text-2xl">Pedí antes de las 18 h y llega el día hábil siguiente.</p>;
  }
  const day = formatDeliveryDay(nextDeliveryDate(now));
  const left = untilCutoff(now);
  return (
    <div aria-live="polite">
      <p className="text-base font-semibold leading-snug sm:text-lg lg:text-xl xl:text-2xl">
        Si pedís ahora, llega el {day}.
      </p>
      <p className="mt-3 text-sm text-white/90 xl:text-base">
        {left
          ? `Faltan ${left.h > 0 ? `${left.h} h ` : ""}${left.m} min para el corte de las 18 h.`
          : "Ya pasó el corte de las 18 h: tu pedido entra en el reparto siguiente."}
      </p>
    </div>
  );
}
