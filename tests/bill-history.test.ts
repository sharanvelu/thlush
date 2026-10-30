import { describe, expect, it } from "vitest";
import { nextDay, todayIn, zonedDayRange, zonedStartOfDay } from "@/lib/dates";
import { buildExportRows, type ExportBill } from "@/lib/bill-export";
import { activeFilterCount, billExportQuerySchema, billListQuerySchema, billReverseSchema } from "@/lib/validation/bill-history";
import { calculateBill, savedLineTax } from "@/services/calculations";

describe("zoned day ranges", () => {
  it("starts a day at local midnight", () => {
    expect(zonedStartOfDay("2026-10-30", "Asia/Kolkata").toISOString()).toBe("2026-10-29T18:30:00.000Z");
    expect(zonedStartOfDay("2026-10-30", "UTC").toISOString()).toBe("2026-10-30T00:00:00.000Z");
  });

  it("follows daylight saving", () => {
    expect(zonedStartOfDay("2026-03-08", "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(zonedStartOfDay("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("makes an inclusive range into [start, end)", () => {
    const { start, end } = zonedDayRange("2026-10-01", "2026-10-31", "Asia/Kolkata");
    expect(start?.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(end?.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("handles open ends and swaps a reversed range", () => {
    expect(zonedDayRange(undefined, undefined, "UTC")).toEqual({ start: null, end: null });
    const swapped = zonedDayRange("2026-10-05", "2026-10-01", "UTC");
    expect(swapped.start?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(swapped.end?.toISOString()).toBe("2026-10-06T00:00:00.000Z");
  });

  it("rolls over month and year ends", () => {
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
  });

  it("finds today in the business timezone", () => {
    const now = new Date("2026-10-30T20:00:00Z");
    expect(todayIn("Asia/Kolkata", 0, now)).toBe("2026-10-31");
    expect(todayIn("UTC", -6, now)).toBe("2026-10-24");
  });
});

describe("bill filter schema", () => {
  it("defaults to newest first, page 1, 20 rows, and no filters", () => {
    const q = billListQuerySchema.parse({});
    expect(q).toMatchObject({ sort: "date_desc", page: 1, pageSize: 20 });
    expect(activeFilterCount(q)).toBe(0);
  });

  it("ignores junk instead of failing", () => {
    const q = billListQuerySchema.parse({ from: "yesterday", min: "abc", method: "bitcoin", status: "nope", cashier: "x", sort: "?", page: "0", customer: "  " });
    expect(q).toMatchObject({ sort: "date_desc", page: 1 });
    expect([q.from, q.min, q.method, q.status, q.cashier, q.customer].every((v) => v === undefined)).toBe(true);
  });

  it("reads and counts real filters (a date range or amount range counts once)", () => {
    const q = billListQuerySchema.parse({ from: "2026-10-01", to: "2026-10-31", customer: " Asha ", min: "10", max: "500", method: "upi", status: "void", sort: "total_desc" });
    expect(q).toMatchObject({ customer: "Asha", min: "10", max: "500", method: "upi", status: "void", sort: "total_desc" });
    expect(activeFilterCount(q)).toBe(5);
  });

  it("supports export formats", () => {
    expect(billExportQuerySchema.parse({ format: "xlsx" }).format).toBe("xlsx");
    expect(billExportQuerySchema.parse({ format: "pdf" }).format).toBe("csv");
  });
});

describe("void and refund input", () => {
  it("needs a real reason", () => {
    expect(billReverseSchema.safeParse({ type: "void", reason: "  " }).success).toBe(false);
    expect(billReverseSchema.safeParse({ type: "void", reason: "ab" }).success).toBe(false);
    expect(billReverseSchema.safeParse({ type: "refund", reason: "Cold food" }).success).toBe(true);
    expect(billReverseSchema.safeParse({ type: "delete", reason: "Cold food" }).success).toBe(false);
  });
});

describe("saved line tax and export rows", () => {
  it("matches what calculateBill charged, including discounts", () => {
    const totals = calculateBill(
      [{ price: "33.33", quantity: 3, sgst: "2.5", cgst: "2.5", discount: "4" }],
      { billDiscount: { type: "percent", value: "10" } },
    );
    const line = totals.lines[0]!;
    const saved = savedLineTax({ price: "33.33", quantity: "3", discount: line.discount, sgst: "2.5", cgst: "2.5" }, true);
    expect(saved.tax).toBe(line.tax);
    expect(saved.sgst).toBe(line.sgst);
  });

  it("is zero when tax was not charged", () => {
    expect(savedLineTax({ price: "100", quantity: "1", discount: "0", sgst: "9", cgst: "9" }, false).tax).toBe("0.00");
  });

  it("writes one row per line with the agreed columns", () => {
    const bill: ExportBill = {
      billNo: "INV-20261030-0001", createdAt: new Date("2026-10-30T10:00:00Z"), currency: "INR", status: "completed",
      customerName: null, totalTax: "10.00",
      items: [{ name: "Masala Dosa", quantity: "2.000", price: "100.00", discount: "0.00", sgst: "2.5", cgst: "2.5", total: "210.00" }],
    };
    const rows = buildExportRows([bill], { timeZone: "Asia/Kolkata", locale: "en-IN", walkInLabel: "Walk-in Customer" });
    expect(rows).toEqual([["INV-20261030-0001", "30 Oct 2026, 3:30 pm", "Walk-in Customer", "Masala Dosa", "2", "INR", "100.00", "10.00", "210.00", "completed"]]);
  });
});
