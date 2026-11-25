import { describe, expect, it } from "vitest";
import { buildPrintJob } from "@/lib/escpos-receipt";
import { defaultSettings } from "@/config";
import { allocateSent, sentKey } from "@/services/kot-plan";
import type { BillItemOptions } from "@/db/schema";
import type { BillDetail } from "@/types/bill";

const prev = (menuItemId: number, sentQty: string, name = "Dosa", options: BillItemOptions | null = null) => ({
  menuItemId,
  name,
  options,
  sentQty,
});
const line = (menuItemId: number, quantity: string, options: BillItemOptions | null = null) => ({
  menuItemId,
  options,
  quantity,
});

describe("allocateSent", () => {
  it("sends only what the kitchen has not had", () => {
    // 2 dosas were sent; the cashier adds 1 more dosa and a new idli.
    const result = allocateSent([prev(1, "2.000")], [line(1, "3"), line(2, "1")], "send");
    expect(result.sentQty).toEqual(["3.000", "1.000"]);
    expect(result.fresh).toEqual([
      { index: 0, quantity: "1.000" },
      { index: 1, quantity: "1.000" },
    ]);
  });

  it("has nothing new when nothing was added", () => {
    expect(allocateSent([prev(1, "2.000")], [line(1, "2")], "send").fresh).toEqual([]);
  });

  it("keeps the earlier sent amounts on a plain hold", () => {
    const result = allocateSent([prev(1, "2.000")], [line(1, "3"), line(2, "1")], "keep");
    expect(result.sentQty).toEqual(["2.000", "0.000"]);
    expect(result.fresh).toEqual([]);
  });

  it("treats a different variant or add-on as a different item", () => {
    const large = { variant: "Large" };
    // A Large dosa was sent. The bill now also has a plain dosa, which the kitchen has not had.
    const result = allocateSent([prev(1, "1.000", "Dosa", large)], [line(1, "1", large), line(1, "1")], "send");
    expect(result.fresh).toEqual([{ index: 1, quantity: "1.000" }]);
    expect(
      sentKey(1, {
        addons: [
          { name: "b", price: "1" },
          { name: "a", price: "1" },
        ],
      }),
    ).toBe(
      sentKey(1, {
        addons: [
          { name: "a", price: "1" },
          { name: "b", price: "1" },
        ],
      }),
    );
  });

  it("treats a different count of the same add-on as a different item", () => {
    expect(sentKey(1, { addons: [{ name: "a", price: "1", quantity: 2 }] })).not.toBe(
      sentKey(1, { addons: [{ name: "a", price: "1", quantity: 3 }] }),
    );
    // No quantity stored (older bills) means one.
    expect(sentKey(1, { addons: [{ name: "a", price: "1" }] })).toBe(
      sentKey(1, { addons: [{ name: "a", price: "1", quantity: 1 }] }),
    );
  });

  it("refuses to drop or reduce an item that was already sent", () => {
    expect(() => allocateSent([prev(1, "2.000")], [line(2, "1")], "send")).toThrow(/already sent/);
    expect(() => allocateSent([prev(1, "2.000")], [line(1, "1")], "keep")).toThrow(/already sent/);
  });

  it("starts fresh for a bill that has not been held before", () => {
    const result = allocateSent([], [line(1, "2")], "send");
    expect(result.fresh).toEqual([{ index: 0, quantity: "2.000" }]);
  });
});

const bill: BillDetail = {
  id: 9,
  billNo: "HOLD-ab12cd34",
  status: "held",
  createdAt: "2026-11-16T10:00:00.000Z",
  currency: "INR",
  subtotal: "0.00",
  totalDiscount: "0.00",
  totalTax: "0.00",
  totalAmount: "0.00",
  discountType: null,
  discountValue: "0.00",
  amountPaid: "0.00",
  changeDue: "0.00",
  orderType: "dine_in",
  tableNo: "4",
  notes: null,
  voidReason: null,
  customer: null,
  cashier: null,
  items: [
    {
      id: 1,
      menuItemId: 1,
      name: "Dosa",
      price: "90.00",
      sgst: "0",
      cgst: "0",
      quantity: "3",
      discount: "0.00",
      total: "270.00",
      options: null,
      sentQty: "3.000",
      isPackaging: false,
    },
    {
      id: 2,
      menuItemId: 2,
      name: "Idli",
      price: "40.00",
      sgst: "0",
      cgst: "0",
      quantity: "1",
      discount: "0.00",
      total: "40.00",
      options: null,
      sentQty: "1.000",
      isPackaging: false,
    },
  ],
  payments: [],
  kots: [
    { seq: 1, createdAt: "2026-11-16T10:00:00.000Z", items: [{ name: "Dosa", quantity: "2.000", details: [] }] },
    {
      seq: 2,
      createdAt: "2026-11-16T10:20:00.000Z",
      items: [
        { name: "Idli", quantity: "1.000", details: [] },
        { name: "Dosa", quantity: "1.000", details: [] },
      ],
    },
  ],
};

const text = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("kitchen slip for one send of a running order", () => {
  it("prints only that send, without the receipt", () => {
    const job = text(buildPrintJob(bill, defaultSettings, { kot: 2, receipt: false }));
    expect(job).toContain("KOT #2");
    expect(job).toContain("1 x Idli");
    expect(job).not.toContain("2 x Dosa");
    expect(job).not.toContain("TOTAL");
    expect(job).not.toContain("HOLD-"); // The temporary number means nothing to the kitchen.
  });

  it("puts the receipt first and the slip after it when finishing", () => {
    const job = text(buildPrintJob(bill, defaultSettings, { kot: 1 }));
    expect(job.indexOf("KOT #1")).toBeGreaterThan(job.indexOf("TOTAL"));
    expect(job).toContain("2 x Dosa");
  });

  it("prints nothing for the slip when that send does not exist", () => {
    expect(text(buildPrintJob(bill, defaultSettings, { kot: 7, receipt: false }))).toBe("");
  });
});

describe("KOT line", () => {
  it("puts the time and the KOT number on one line", () => {
    const job = text(buildPrintJob(bill, defaultSettings, { kot: 2, receipt: false }));
    const line = job.split("\n").find((l) => l.includes("KOT #2"));
    expect(line).toBeDefined();
    // The date comes first and the number follows on the same line (size commands sit between the two).
    expect(line).toMatch(/20\d\d[^\n]*KOT #2/);
  });
});

describe("order number on the kitchen slip", () => {
  const done = { ...bill, billNo: "INV-20261116-0007", status: "completed" as const };
  const slip = (b: BillDetail) => text(buildPrintJob(b, defaultSettings, { kitchen: true, receipt: false }));

  it("shows only the short counter, never the whole invoice number", () => {
    for (const orderType of ["dine_in", "takeaway", "delivery"] as const) {
      const job = slip({ ...done, orderType, tableNo: orderType === "dine_in" ? "4" : null });
      expect(job).toContain("#0007");
      expect(job).not.toContain("INV-");
    }
  });

  it("puts the order type first and the number after it on one line", () => {
    const line = slip(done)
      .split("\n")
      .find((l) => l.includes("Dine-in"));
    expect(line).toMatch(/Dine-in - Table 4[^\n]*#0007/);
  });

  it("shows nothing for a running order's temporary number", () => {
    const job = text(buildPrintJob(bill, defaultSettings, { kot: 1, receipt: false }));
    expect(job).not.toMatch(/#\d{4}|HOLD-/);
  });
});

describe("packaging on the kitchen slip", () => {
  it("leaves the system's packaging line off the full-bill slip", () => {
    const withPackaging = {
      ...bill,
      items: [
        ...bill.items,
        {
          id: 9,
          menuItemId: null,
          name: "Packaging",
          price: "20.00",
          sgst: "0",
          cgst: "0",
          quantity: "1",
          discount: "0.00",
          total: "20.00",
          options: null,
          sentQty: "0.000",
          isPackaging: true,
        },
      ],
    };
    const job = text(buildPrintJob(withPackaging, defaultSettings, { kitchen: true, receipt: false }));
    expect(job).toContain("3 x Dosa");
    expect(job).not.toContain("Packaging");
  });
});
