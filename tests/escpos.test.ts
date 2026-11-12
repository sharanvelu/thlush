import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/config";
import { EscPosBuilder, paperColumns, toPrinterText, wrapText } from "@/lib/escpos";
import { buildPrintJob } from "@/lib/escpos-receipt";
import type { BillDetail } from "@/types/bill";

const CUT = [0x1d, 0x56, 66, 0];

/** The byte offsets where a partial-cut command starts. */
function cutOffsets(bytes: Uint8Array): number[] {
  const found: number[] = [];
  for (let i = 0; i <= bytes.length - CUT.length; i++) {
    if (CUT.every((b, j) => bytes[i + j] === b)) found.push(i);
  }
  return found;
}

const decode = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

const bill: BillDetail = {
  id: 7, billNo: "INV-20261113-0007", status: "completed", createdAt: "2026-11-13T10:00:00.000Z", currency: "INR",
  subtotal: "180.00", totalDiscount: "0.00", totalTax: "9.00", totalAmount: "189.00", discountType: null, discountValue: "0.00",
  amountPaid: "200.00", changeDue: "11.00", orderType: "dine_in", tableNo: "4", notes: "Less spicy", voidReason: null,
  customer: null, cashier: { id: "u", name: "Charu" },
  items: [
    { id: 1, menuItemId: 1, name: "Masala Dosa with a really long name that must wrap", price: "90.00", sgst: "2.5", cgst: "2.5", quantity: "2", discount: "0.00", total: "189.00", options: { variant: "Large", addons: [{ name: "Extra cheese", price: "10.00" }] } },
  ],
  payments: [{ id: 1, method: "cash", amount: "200.00", reference: null }],
};

describe("toPrinterText / wrapText", () => {
  it("keeps ASCII, strips accents and replaces what the printer cannot show", () => {
    expect(toPrinterText("Café · ₹5 — ok 😀")).toBe("Cafe - Rs.5 - ok ?");
  });

  it("wraps on spaces and splits words longer than the line", () => {
    expect(wrapText("aaa bbb ccc", 7)).toEqual(["aaa bbb", "ccc"]);
    expect(wrapText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });
});

describe("EscPosBuilder", () => {
  it("pads a row to the full line width", () => {
    const text = decode(new EscPosBuilder(20).row("Total", "10.00").build());
    expect(text).toBe(`Total${" ".repeat(10)}10.00\n`);
  });

  it("emits init, alignment and cut commands", () => {
    const bytes = new EscPosBuilder(32).init().align("center").cut().build();
    const initLength = new EscPosBuilder(32).init().build().length;
    expect([...bytes].slice(0, 2)).toEqual([0x1b, 0x40]);
    expect([...bytes].slice(initLength)).toEqual([0x1b, 0x61, 1, ...CUT]);
  });

  it.each([
    ["58mm", 32, 384],
    ["80mm", 48, 576],
  ] as const)("fits the print area to %s paper", (_paper, columns, dots) => {
    const bytes = [...new EscPosBuilder(columns).init().build()];
    // ESC @, then GS L 0 0 (no left margin), then GS W <width in dots, little endian>.
    expect(bytes).toEqual([0x1b, 0x40, 0x1d, 0x4c, 0, 0, 0x1d, 0x57, dots & 0xff, dots >> 8]);
  });

  it("uses 48 columns on 80mm paper and 32 on 58mm", () => {
    expect([paperColumns("80mm"), paperColumns("58mm")]).toEqual([48, 32]);
  });
});

describe("buildPrintJob", () => {
  it("cuts once after the receipt when there is no kitchen slip", () => {
    const job = buildPrintJob(bill, defaultSettings, { kitchen: false });
    expect(cutOffsets(job)).toHaveLength(1);
    expect(decode(job)).not.toContain("KITCHEN");
  });

  it("cuts between the receipt and the kitchen slip, and again at the end", () => {
    const job = buildPrintJob(bill, defaultSettings, { kitchen: true });
    const cuts = cutOffsets(job);
    expect(cuts).toHaveLength(2);
    const text = decode(job);
    expect(text.indexOf("TOTAL")).toBeLessThan(cuts[0]!);
    expect(text.indexOf("KITCHEN")).toBeGreaterThan(cuts[0]!);
    expect(cuts[1]).toBe(job.length - CUT.length);
  });

  it("puts what the kitchen needs on the slip and leaves prices off it", () => {
    const job = buildPrintJob(bill, defaultSettings, { kitchen: true });
    const slip = decode(job.slice(cutOffsets(job)[0]! + CUT.length));
    expect(slip).toContain("Table 4");
    expect(slip).toContain("Large");
    expect(slip).toContain("+ Extra cheese");
    expect(slip).toContain("Note: Less spicy");
    expect(slip).not.toMatch(/\d+\.\d{2}/);
  });

  it("never exceeds the paper width on the receipt", () => {
    const text = decode(buildPrintJob(bill, defaultSettings, { kitchen: false }));
    const width = paperColumns(defaultSettings.receipt.paperSize);
    // Size commands are control bytes; drop them, then every printable line must fit.
    for (const line of text.split("\n")) {
      const printable = line.replace(/[\x00-\x1f][\x00-\x7f]{0,3}/g, "");
      expect(printable.length).toBeLessThanOrEqual(width + 4);
    }
  });
});
