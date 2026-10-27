"use client";

import { useEffect, useMemo, useState } from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import { BaseMap, FitBounds, depotIcon, dotIcon, truckIcon } from "./BaseMap";
import { DEPOT, interpolatePosition, type LatLng } from "@/lib/geo";

export type TrackStop = { seq: number; lat: number; lng: number; done: boolean; mine: boolean };

/** Maqueta del seguimiento: el camión avanza en bucle entre la última parada entregada y la siguiente. */
export default function TruckMap({ stops }: { stops: TrackStop[] }) {
  const path: LatLng[] = useMemo(() => [DEPOT, ...stops.map((s) => ({ lat: s.lat, lng: s.lng }))], [stops]);
  const nextIdx = stops.findIndex((s) => !s.done); // índice en stops
  const segment = useMemo(() => {
    if (nextIdx < 0) return [path[path.length - 1]];
    return [path[nextIdx], path[nextIdx + 1]]; // path está corrido uno por el depósito
  }, [path, nextIdx]);
  const [t, setT] = useState(0.15);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(0.5);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const cycle = ((now - start) / 24000) % 1; // 24 s por tramo
      setT(0.1 + cycle * 0.8);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const truck = interpolatePosition(segment, t);

  return (
    <BaseMap center={DEPOT} className="h-[340px] w-full rounded-xl sm:h-[420px]">
      <FitBounds points={path} />
      <Polyline positions={path.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#1A1A1A", weight: 4, opacity: 0.35, dashArray: "6 8" }} />
      {nextIdx > 0 && <Polyline positions={path.slice(0, nextIdx + 1).map((p) => [p.lat, p.lng])} pathOptions={{ color: "#1A1A1A", weight: 4, opacity: 0.8 }} />}
      <Marker position={[DEPOT.lat, DEPOT.lng]} icon={depotIcon()}>
        <Tooltip>Depósito Lama · Figueroa 651</Tooltip>
      </Marker>
      {stops.map((s) => (
        <Marker key={s.seq} position={[s.lat, s.lng]} icon={s.mine ? dotIcon("#DA2128", "★", 34) : dotIcon(s.done ? "#1A1A1A" : "#7A7A7A", s.seq)}>
          <Tooltip>{s.mine ? "Tu local" : s.done ? `Parada ${s.seq} · entregada` : `Parada ${s.seq}`}</Tooltip>
        </Marker>
      ))}
      <Marker position={[truck.lat, truck.lng]} icon={truckIcon()} zIndexOffset={1000} />
    </BaseMap>
  );
}
