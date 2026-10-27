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

  useEffect(() => setLines(read(storageKey)), [storageKey]);

  const persist = useCallback(
    (next: CartLine[]) => {
      setLines(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // almacenamiento no disponible: el carrito vive solo en memoria
      }
    },
    [storageKey],
  );

  const value = useMemo<CartCtx>(() => {
    const setQty = (productId: string, qty: number) => {
      const rest = lines.filter((l) => l.productId !== productId);
      persist(qty > 0 ? [...rest, { productId, qty }] : rest);
    };
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      qtyOf: (id) => lines.find((l) => l.productId === id)?.qty ?? 0,
      setQty,
      add: (id, qty = 1) => setQty(id, (lines.find((l) => l.productId === id)?.qty ?? 0) + qty),
      replace: (next) => persist(next.filter((l) => l.qty > 0)),
      clear: () => persist([]),
    };
  }, [lines, persist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const EMPTY: CartCtx = { lines: [], count: 0, qtyOf: () => 0, setQty: () => {}, add: () => {}, replace: () => {}, clear: () => {} };

export function useCart(): CartCtx {
  return useContext(Ctx) ?? EMPTY;
}
