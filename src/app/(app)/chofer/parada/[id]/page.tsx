import Link from "next/link";
import { notFound } from "next/navigation";
import { Navigation, Phone } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { DeliveryForm } from "./DeliveryForm";

export default async function ParadaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["chofer"], "/chofer");
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("route_stops").select("id, seq, status, orders(number, customers(name, address, phone, lat, lng))").eq("id", id).single();
  if (!s) notFound();
  const { data: items } = await supabase.rpc("driver_stop_items", { p_stop: id });
  const o = s.orders as unknown as { number: number; customers: { name: string; address: string; phone: string | null; lat: number; lng: number } | null } | null;
  const c = o?.customers;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/chofer" className="text-sm text-lama-steel hover:text-lama-red">← Mi ruta</Link>
      <div>
        <p className="text-sm text-lama-steel">Parada {s.seq} · pedido #{o?.number}</p>
        <h1 className="energetic text-2xl">{c?.name}</h1>
        <p className="text-sm">{c?.address}</p>
        <div className="mt-3 flex gap-2">
          {c && <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-lama-ink font-display text-sm font-bold text-white"><Navigation className="h-4 w-4" />Navegar</a>}
          {c?.phone && <a href={`tel:${c.phone}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border-2 border-lama-ink font-display text-sm font-bold"><Phone className="h-4 w-4" />Llamar</a>}
        </div>
      </div>
      {s.status !== "pendiente" ? (
        <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">Esta parada ya está registrada.</p>
      ) : (
        <DeliveryForm stopId={s.id} items={(items ?? []) as { item_id: string; name: string; unit: string; qty: number; qty_prepared: number | null }[]} />
      )}
    </div>
  );
}
