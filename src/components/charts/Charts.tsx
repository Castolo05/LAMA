"use client";

import { formatARS, formatNumber, formatPct } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Paleta validada (scripts/validate_palette.js, modo claro): portal, teléfono
export const CHANNEL_COLORS = { portal: "#DA2128", telefono: "#D08A12" } as const;
const INK = "#1A1A1A";
const GRID = "#E3E5E9";
const AXIS = { fontSize: 12, fill: "#7A7A7A" };
export type ValueKind = "pct" | "ars" | "millions" | "number";
const FORMAT: Record<ValueKind, (n: number) => string> = {
  pct: (n) => formatPct(n, 0),
  ars: (n) => formatARS(n).replace(",00", ""),
  millions: (n) => `$ ${formatNumber(n / 1e6, 0)} M`,
  number: (n) => formatNumber(n),
};
const tooltipStyle = { borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 13 };

export function KpiLine({ data, dataKey, label, kind }: { data: Record<string, number | string>[]; dataKey: string; label: string; kind: ValueKind }) {
  const format = FORMAT[kind];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => format(Number(v))} width={72} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [format(Number(v)), label]} cursor={{ stroke: GRID, strokeWidth: 2 }} />
        <Line type="monotone" dataKey={dataKey} stroke={INK} strokeWidth={2} dot={{ r: 4, fill: INK, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ChannelStack({ data }: { data: { label: string; portal: number; telefono: number }[] }) {
  const pct = (n: number) => `${Math.round(n * 100)} %`;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={pct} width={48} domain={[0, 1]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [pct(Number(v)), n]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 13, color: INK }} />
        <Bar dataKey="portal" name="Portal web" stackId="c" fill={CHANNEL_COLORS.portal} stroke="#fff" strokeWidth={2} />
        <Bar dataKey="telefono" name="Teléfono" stackId="c" fill={CHANNEL_COLORS.telefono} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UnitsBar({ data, kind = "number" }: { data: { label: string; value: number }[]; kind?: ValueKind }) {
  const format = FORMAT[kind];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => format(Number(v))} width={60} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [format(Number(v)), "Unidades"]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="value" fill={CHANNEL_COLORS.portal} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
