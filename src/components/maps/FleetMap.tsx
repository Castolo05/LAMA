"use client";

import { useEffect, useState } from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import { BaseMap, FitBounds, depotIcon, truckIcon } from "./BaseMap";
import { DEPOT, interpolatePosition, type LatLng } from "@/lib/geo";

export type FleetTruck = { id: string; name: string; path: LatLng[]; moving: boolean };

/** Maqueta: posición simulada de cada camión recorriendo en bucle la ruta del día. */
export default function FleetMap({ trucks }: { trucks: FleetTruck[] }) {
  const [t, setT] = useState(0.3);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(((now - start) / 90000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const all = [DEPOT, ...trucks.flatMap((x) => x.path)];
  return (
    <BaseMap center={DEPOT} zoom={13} className="h-[380px] w-full rounded-xl">
      <FitBounds points={all} />
      <Marker position={[DEPOT.lat, DEPOT.lng]} icon={depotIcon()}><Tooltip>Depósito Lama</Tooltip></Marker>
      {trucks.filter((x) => x.moving).map((x) => (
        <Polyline key={`p-${x.id}`} positions={x.path.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#1A1A1A", weight: 3, opacity: 0.35, dashArray: "6 8" }} />
      ))}
      {trucks.map((x, i) => {
        const pos = x.moving ? interpolatePosition(x.path, (t + i * 0.37) % 1) : { lat: DEPOT.lat + 0.0006 * (i - 2), lng: DEPOT.lng + 0.0009 * (i - 2) };
        return (
          <Marker key={x.id} position={[pos.lat, pos.lng]} icon={truckIcon(x.moving ? "#DA2128" : "#7A7A7A")}>
            <Tooltip>{x.name}{x.moving ? " · en reparto" : " · en depósito"}</Tooltip>
          </Marker>
        );
      })}
    </BaseMap>
  );
}
