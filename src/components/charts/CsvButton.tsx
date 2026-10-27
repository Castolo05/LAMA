"use client";

import { Download } from "lucide-react";
import { toCsv } from "@/lib/csv";

export function CsvButton({ rows, filename, label = "Exportar CSV" }: { rows: Record<string, unknown>[]; filename: string; label?: string }) {
  return (
    <button
      disabled={rows.length === 0}
      onClick={() => {
        const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-lama-red hover:bg-lama-red-soft disabled:opacity-40"
    >
      <Download className="h-4 w-4" /> {label}
    </button>
  );
}
