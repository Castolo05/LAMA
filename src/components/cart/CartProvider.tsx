"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { productId: string; qty: number };

type CartCtx = {
  lines: CartLine[];
  count: number;
  qtyOf: (productId: string) => number;
  setQty: (productId: string, qty: number) => void;
  add: (productId: string, qty?: number) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

function read(key: string): CartLine[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.productId === "string" && l.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLines(read(storageKey));
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // almacenamiento no disponible: el carrito vive solo en memoria
    }
  }, [lines, loaded, storageKey]);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      const rest = prev.filter((l) => l.productId !== productId);
      return qty > 0 ? [...rest, { productId, qty }] : rest;
    });
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      qtyOf: (id) => lines.find((l) => l.productId === id)?.qty ?? 0,
      setQty,
      add: (id, qty = 1) =>
        setLines((prev) => {
          const cur = prev.find((l) => l.productId === id)?.qty ?? 0;
          const rest = prev.filter((l) => l.productId !== id);
          return cur + qty > 0 ? [...rest, { productId: id, qty: cur + qty }] : rest;
        }),
      replace: (next) => setLines(next.filter((l) => l.qty > 0)),
      clear: () => setLines([]),
    }),
    [lines, setQty],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const EMPTY: CartCtx = { lines: [], count: 0, qtyOf: () => 0, setQty: () => {}, add: () => {}, replace: () => {}, clear: () => {} };

export function useCart(): CartCtx {
  return useContext(Ctx) ?? EMPTY;
}
