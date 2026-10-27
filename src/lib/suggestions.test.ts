import { describe, expect, it } from "vitest";
import { suggestReorder } from "./suggestions";

describe("suggestReorder", () => {
  it("sugiere lo que se compra seguido y ya tocaría reponer", () => {
    const history = [
      { product_id: "coca", ordered_on: "2026-09-26" },
      { product_id: "coca", ordered_on: "2026-10-03" },
      { product_id: "coca", ordered_on: "2026-10-10" },
      { product_id: "coca", ordered_on: "2026-10-17" },
      { product_id: "leche", ordered_on: "2026-10-20" },
      { product_id: "leche", ordered_on: "2026-10-23" },
      { product_id: "leche", ordered_on: "2026-10-26" },
    ];
    expect(suggestReorder(history, "2026-10-27")).toEqual(["coca"]);
  });
  it("ignora productos con menos de 3 compras", () => {
    expect(suggestReorder([{ product_id: "x", ordered_on: "2026-01-01" }, { product_id: "x", ordered_on: "2026-02-01" }], "2026-10-27")).toEqual([]);
  });
});
