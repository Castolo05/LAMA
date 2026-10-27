"use client";

import { Marker, Polyline, Tooltip } from "react-leaflet";
import { BaseMap, FitBounds, depotIcon, dotIcon } from "./BaseMap";
import { DEPOT, type LatLng } from "@/lib/geo";

export const ROUTE_COLORS = ["#DA2128", "#1A1A1A", "#3B5BA9", "#E58A2B", "#2E7D5B", "#8A4FB5"];

export type MapRoute = { color: string; label: string; points: (LatLng & { name: string; seq: number })[] };

export default function PlanMap({ routes, loose = [] }: { routes: MapRoute[]; loose?: (LatLng & { name: string })[] }) {
  const all = [DEPOT, ...routes.flatMap((r) => r.points), ...loose];
  return (
    <BaseMap center={DEPOT} zoom={12} className="h-[420px] w-full rounded-xl lg:h-[560px]">
      <FitBounds points={all} />
      <Marker position={[DEPOT.lat, DEPOT.lng]} icon={depotIcon()}><Tooltip>Depósito Lama</Tooltip></Marker>
      {routes.map((r) => (
        <Polyline key={r.label} positions={[DEPOT, ...r.points, DEPOT].map((p) => [p.lat, p.lng])} pathOptions={{ color: r.color, weight: 4, opacity: 0.85 }} />
      ))}
      {routes.flatMap((r) =>
        r.points.map((p) => (
          <Marker key={`${r.label}-${p.seq}-${p.name}`} position={[p.lat, p.lng]} icon={dotIcon(r.color, p.seq, 24)}>
            <Tooltip>{r.label} · {p.seq}. {p.name}</Tooltip>
          </Marker>
        )),
      )}
      {loose.map((p) => (
        <Marker key={`l-${p.name}`} position={[p.lat, p.lng]} icon={dotIcon("#7A7A7A", "", 18)}><Tooltip>{p.name}</Tooltip></Marker>
      ))}
    </BaseMap>
  );
}
