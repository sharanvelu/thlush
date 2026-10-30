import { describe, expect, it } from "vitest";
import { directionHint, reasonAllowsDirection, stockStatus, stockValue } from "@/lib/inventory";
import { movementQuerySchema, purchaseSchema, stockAdjustSchema, stockListQuerySchema, supplierPatchSchema, supplierSchema } from "@/lib/validation/inventory";

describe("stock status", () => {
  it("is out at zero or below, low at the reorder level, in stock above it", () => {
    expect(stockStatus("0", "10")).toBe("out");
    expect(stockStatus("-3", "0")).toBe("out");
    expect(stockStatus("10", "10")).toBe("low");
    expect(stockStatus("10.001", "10")).toBe("in");
    expect(stockStatus("5", "0")).toBe("in");
    expect(stockStatus("0.5", "2")).toBe("low");
  });

  it("values stock at cost, never below zero", () => {
    expect(stockValue("12.5", "40")).toBe("500.00");
    expect(stockValue("3", "33.333")).toBe("100.00");
    expect(stockValue("-4", "40")).toBe("0.00");
    expect(stockValue("0", "40")).toBe("0.00");
  });
});

describe("adjustment rules", () => {
  it("only allows sensible directions for each reason", () => {
    expect(reasonAllowsDirection("purchase", "add")).toBe(true);
    expect(reasonAllowsDirection("purchase", "remove")).toBe(false);
    expect(reasonAllowsDirection("wastage", "remove")).toBe(true);
    expect(reasonAllowsDirection("damage", "add")).toBe(false);
    expect(reasonAllowsDirection("correction", "add") && reasonAllowsDirection("correction", "remove")).toBe(true);
    expect(reasonAllowsDirection("return", "add") && reasonAllowsDirection("return", "remove")).toBe(true);
    expect(directionHint("wastage")).toBe("remove");
    expect(directionHint("correction")).toBeNull();
  });

  it("validates an adjustment", () => {
    const ok = { menuItemId: 4, direction: "remove", quantity: "2.5", reason: "wastage", note: " spoiled " };
    expect(stockAdjustSchema.parse(ok)).toMatchObject({ quantity: "2.5", note: "spoiled" });
    expect(stockAdjustSchema.safeParse({ ...ok, quantity: "0" }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, quantity: "-1" }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, reason: "sale" }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, reason: "purchase" }).success).toBe(false);
    expect(stockAdjustSchema.safeParse({ ...ok, direction: "sideways" }).success).toBe(false);
  });
});

describe("purchases and suppliers", () => {
  const line = { menuItemId: 1, quantity: "10", costPrice: "12.50" };
  it("needs items, positive quantities and no duplicates", () => {
    expect(purchaseSchema.safeParse({ items: [] }).success).toBe(false);
    expect(purchaseSchema.safeParse({ items: [{ ...line, quantity: "0" }] }).success).toBe(false);
    expect(purchaseSchema.safeParse({ items: [line, line] }).success).toBe(false);
    expect(purchaseSchema.parse({ items: [line], supplierId: 3, date: "2026-10-30", invoiceNo: " A-1 " })).toMatchObject({ supplierId: 3, invoiceNo: "A-1" });
    expect(purchaseSchema.parse({ items: [line] })).toMatchObject({ supplierId: null, date: null, invoiceNo: null });
  });

  it("validates suppliers, and an update only holds what was sent", () => {
    expect(supplierSchema.parse({ name: " Metro " })).toMatchObject({ name: "Metro", status: "active", email: null });
    expect(supplierSchema.safeParse({ name: "X", email: "nope" }).success).toBe(false);
    expect(supplierPatchSchema.parse({ phone: "98450" })).toEqual({ phone: "98450" });
    expect(supplierPatchSchema.parse({})).toEqual({});
  });

  it("reads list queries defensively", () => {
    expect(stockListQuerySchema.parse({ sort: "zzz", status: "meh", page: "0" })).toMatchObject({ sort: "name_asc", page: 1, pageSize: 25 });
    expect(stockListQuerySchema.parse({ status: "low", category: "3" })).toMatchObject({ status: "low", category: 3 });
    expect(movementQuerySchema.parse({ reason: "wastage", item: "x" })).toMatchObject({ reason: "wastage" });
  });
});
