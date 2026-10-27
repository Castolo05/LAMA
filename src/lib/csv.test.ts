import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("usa punto y coma, BOM y escapa comillas y separadores", () => {
    const csv = toCsv([{ nombre: 'Kiosco "El Paso"', zona: "Centro; Tandil", total: 12.5 }]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿nombre;zona;total\r\n"Kiosco ""El Paso""";"Centro; Tandil";12,5');
  });
  it("devuelve vacío sin filas", () => {
    expect(toCsv([])).toBe("");
  });
});
