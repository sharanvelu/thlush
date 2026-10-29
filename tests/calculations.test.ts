import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  balanceDue,
  calculateBill,
  changeDue,
  resolveBillDiscount,
  unitPriceInclTax,
} from "@/services/calculations";
import { D } from "@/lib/money";

describe("calculateBill: tax", () => {
  it("adds SGST and CGST on top of a tax-exclusive price", () => {
    const result = calculateBill([{ price: "100", quantity: 2, sgst: "2.5", cgst: "2.5" }]);
    expect(result.subtotal).toBe("200.00");
    expect(result.sgst).toBe("5.00");
    expect(result.cgst).toBe("5.00");
    expect(result.totalTax).toBe("10.00");
    expect(result.grandTotal).toBe("210.00");
    expect(result.lines[0]?.total).toBe("210.00");
  });

  it("reports zero tax and a plain total when ignoreTax is set", () => {
    const result = calculateBill([{ price: "100", quantity: 2, sgst: "9", cgst: "9" }], {
      ignoreTax: true,
    });
    expect(result.totalTax).toBe("0.00");
    expect(result.sgst).toBe("0.00");
    expect(result.cgst).toBe("0.00");
    expect(result.grandTotal).toBe("200.00");
  });

  it("handles mixed tax rates across lines", () => {
    const result = calculateBill([
      { price: "50", quantity: 1, sgst: "2.5", cgst: "2.5" },
      { price: "120", quantity: 1, sgst: "9", cgst: "9" },
      { price: "30", quantity: 3, sgst: "0", cgst: "0" },
    ]);
    // 50 -> 1.25 + 1.25, 120 -> 10.80 + 10.80, 90 -> 0
    expect(result.sgst).toBe("12.05");
    expect(result.cgst).toBe("12.05");
    expect(result.subtotal).toBe("260.00");
    expect(result.grandTotal).toBe("284.10");
  });

  it("treats missing tax rates as zero", () => {
    const result = calculateBill([{ price: "10", quantity: 1 }]);
    expect(result.totalTax).toBe("0.00");
    expect(result.grandTotal).toBe("10.00");
  });

  it("rounds tax per line half-up and keeps totals reconciled", () => {
    // 33.33 x 3 = 99.99; 2.5% = 2.49975 -> 2.50 per component
    const result = calculateBill([{ price: "33.33", quantity: 3, sgst: "2.5", cgst: "2.5" }]);
    expect(result.subtotal).toBe("99.99");
    expect(result.sgst).toBe("2.50");
    expect(result.cgst).toBe("2.50");
    expect(result.grandTotal).toBe("104.99");
  });

  it("does not suffer from floating point drift", () => {
    // 0.1 + 0.2 style errors must not appear.
    const result = calculateBill([
      { price: "0.10", quantity: 1 },
      { price: "0.20", quantity: 1 },
    ]);
    expect(result.subtotal).toBe("0.30");
    expect(result.grandTotal).toBe("0.30");
  });

  it("supports fractional quantities such as kilograms", () => {
    const result = calculateBill([{ price: "200", quantity: "0.75", sgst: "2.5", cgst: "2.5" }]);
    expect(result.subtotal).toBe("150.00");
    expect(result.totalTax).toBe("7.50");
    expect(result.grandTotal).toBe("157.50");
  });

  it("returns zeros for an empty bill", () => {
    const result = calculateBill([]);
    expect(result.lines).toEqual([]);
    expect(result.subtotal).toBe("0.00");
    expect(result.grandTotal).toBe("0.00");
  });
});

describe("calculateBill: line discounts", () => {
  it("applies a flat line discount before tax", () => {
    const result = calculateBill([
      { price: "100", quantity: 2, sgst: "2.5", cgst: "2.5", discount: "20" },
    ]);
    // taxable 180 -> tax 4.50 + 4.50
    expect(result.lineDiscounts).toBe("20.00");
    expect(result.totalDiscount).toBe("20.00");
    expect(result.totalTax).toBe("9.00");
    expect(result.grandTotal).toBe("189.00");
  });

  it("caps a line discount at the line gross", () => {
    const result = calculateBill([{ price: "50", quantity: 1, sgst: "5", cgst: "5", discount: "500" }]);
    expect(result.lines[0]?.lineDiscount).toBe("50.00");
    expect(result.grandTotal).toBe("0.00");
  });

  it("ignores negative discounts", () => {
    const result = calculateBill([{ price: "50", quantity: 1, discount: "-10" }]);
    expect(result.totalDiscount).toBe("0.00");
    expect(result.grandTotal).toBe("50.00");
  });
});

describe("calculateBill: bill discounts", () => {
  const lines = [
    { price: "100", quantity: 1, sgst: "2.5", cgst: "2.5" },
    { price: "200", quantity: 1, sgst: "2.5", cgst: "2.5" },
  ];

  it("applies a percentage discount to the subtotal, before tax", () => {
    const result = calculateBill(lines, { billDiscount: { type: "percent", value: 10 } });
    expect(result.billDiscount).toBe("30.00");
    expect(result.totalDiscount).toBe("30.00");
    // taxable 270 -> 6.75 tax per component = 13.50
    expect(result.totalTax).toBe("13.50");
    expect(result.grandTotal).toBe("283.50");
  });

  it("applies a flat discount", () => {
    const result = calculateBill(lines, { billDiscount: { type: "flat", value: "60" } });
    expect(result.billDiscount).toBe("60.00");
    expect(result.grandTotal).toBe("252.00");
  });

  it("caps a flat discount at the discountable amount", () => {
    const result = calculateBill(lines, { billDiscount: { type: "flat", value: "9999" } });
    expect(result.billDiscount).toBe("300.00");
    expect(result.totalTax).toBe("0.00");
    expect(result.grandTotal).toBe("0.00");
  });

  it("caps a percentage above 100 at 100", () => {
    const result = calculateBill(lines, { billDiscount: { type: "percent", value: 250 } });
    expect(result.billDiscount).toBe("300.00");
    expect(result.grandTotal).toBe("0.00");
  });

  it("splits the discount across lines so shares add up exactly", () => {
    const result = calculateBill(
      [
        { price: "10", quantity: 1 },
        { price: "10", quantity: 1 },
        { price: "10", quantity: 1 },
      ],
      { billDiscount: { type: "flat", value: "10" } },
    );
    const shares = result.lines.map((l) => new D(l.billDiscountShare));
    const total = shares.reduce((a, b) => a.plus(b), new D(0));
    expect(total.toFixed(2)).toBe("10.00");
    expect(result.grandTotal).toBe("20.00");
  });

  it("applies the bill discount after line discounts", () => {
    const result = calculateBill([{ price: "100", quantity: 1, discount: "20" }], {
      billDiscount: { type: "percent", value: 50 },
    });
    // after line discount: 80, 50% -> 40
    expect(result.lineDiscounts).toBe("20.00");
    expect(result.billDiscount).toBe("40.00");
    expect(result.totalDiscount).toBe("60.00");
    expect(result.grandTotal).toBe("40.00");
  });

  it("ignores a discount on an empty bill", () => {
    const result = calculateBill([], { billDiscount: { type: "flat", value: 50 } });
    expect(result.billDiscount).toBe("0.00");
    expect(result.grandTotal).toBe("0.00");
  });

  it("always reconciles: grand total = subtotal - discount + tax", () => {
    const result = calculateBill(
      [
        { price: "17.77", quantity: 3, sgst: "2.5", cgst: "2.5", discount: "1.11" },
        { price: "89.99", quantity: 2, sgst: "6", cgst: "6" },
        { price: "5.55", quantity: 7, sgst: "9", cgst: "9" },
      ],
      { billDiscount: { type: "percent", value: 12.5 } },
    );
    const expected = new D(result.subtotal)
      .minus(result.totalDiscount)
      .plus(result.totalTax)
      .toFixed(2);
    expect(result.grandTotal).toBe(expected);
    const lineSum = result.lines.reduce((acc, l) => acc.plus(l.total), new D(0)).toFixed(2);
    expect(result.grandTotal).toBe(lineSum);
  });
});

describe("resolveBillDiscount", () => {
  it("returns zero without a discount", () => {
    expect(resolveBillDiscount("100", null).toFixed(2)).toBe("0.00");
  });

  it("rounds percentage discounts to 2 dp", () => {
    expect(resolveBillDiscount("99.99", { type: "percent", value: 15 }).toFixed(2)).toBe("15.00");
  });
});

describe("allocateProportionally", () => {
  it("distributes remainders to the largest fractions", () => {
    const parts = allocateProportionally(new D("0.10"), [new D(1), new D(1), new D(1)]);
    expect(parts.map((p) => p.toFixed(2))).toEqual(["0.04", "0.03", "0.03"]);
  });

  it("returns zeros when there is nothing to allocate", () => {
    expect(allocateProportionally(new D(0), [new D(5)]).map(String)).toEqual(["0"]);
    expect(allocateProportionally(new D(5), [new D(0), new D(0)]).map(String)).toEqual(["0", "0"]);
  });
});

describe("unitPriceInclTax", () => {
  it("adds combined tax to the unit price", () => {
    expect(unitPriceInclTax("100", "2.5", "2.5")).toBe("105.00");
  });

  it("rounds each tax component like a bill line does", () => {
    // 145 x 2.5% = 3.625 -> 3.63 for each half, so one unit costs 152.26 (not 152.25).
    expect(unitPriceInclTax("145", "2.5", "2.5")).toBe("152.26");
    expect(calculateBill([{ price: "145", quantity: 1, sgst: "2.5", cgst: "2.5" }]).grandTotal).toBe("152.26");
  });

  it("returns the base price when tax is ignored", () => {
    expect(unitPriceInclTax("100", "2.5", "2.5", true)).toBe("100.00");
  });
});

describe("payment helpers", () => {
  it("computes change and never goes negative", () => {
    expect(changeDue("210.00", "500")).toBe("290.00");
    expect(changeDue("210.00", "100")).toBe("0.00");
  });

  it("computes the remaining balance", () => {
    expect(balanceDue("210.00", "100")).toBe("110.00");
    expect(balanceDue("210.00", "250")).toBe("0.00");
  });
});
