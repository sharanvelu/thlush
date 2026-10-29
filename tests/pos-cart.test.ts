import { describe, expect, it } from "vitest";
import {
  cartReducer,
  cartTotals,
  lineKey,
  quickCashAmounts,
  resolvePayment,
  unitPriceOf,
  type CartLine,
  type PaymentState,
  type PosItem,
} from "@/components/pos/pos-cart";

const dosa: PosItem = {
  id: 1, name: "Masala Dosa", price: "100.00", sgst: "2.50", cgst: "2.50", categoryId: 1, categoryName: "South Indian",
  sku: "SIN-001", isVeg: true, imageSrc: null, variants: [], addons: [], unit: "pcs", trackStock: false, stockQty: "0.000", status: "active",
};
const coffee: PosItem = {
  ...dosa, id: 2, name: "Cold Coffee", price: "90.00", sku: "BEV-003",
  variants: [{ name: "Regular", priceDelta: "0" }, { name: "Large", priceDelta: "30" }],
  addons: [{ name: "Extra shot", price: "25" }],
};
const rice: PosItem = { ...dosa, id: 3, name: "Basmati", price: "200.00", unit: "kg" };

const add = (state: CartLine[], item: PosItem, variant: string | null = null, addons: string[] = []) =>
  cartReducer(state, { type: "add", item, variant, addons });

describe("cartReducer", () => {
  it("adds an item, and adding it again raises the quantity", () => {
    let cart = add([], dosa);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.quantity).toBe("1");
    cart = add(cart, dosa);
    expect(cart).toHaveLength(1);
    expect(cart[0]?.quantity).toBe("2");
  });

  it("keeps different variants and add-ons on separate lines", () => {
    let cart = add([], coffee, "Regular");
    cart = add(cart, coffee, "Large");
    cart = add(cart, coffee, "Large", ["Extra shot"]);
    expect(cart.map((l) => l.key)).toEqual([
      lineKey(2, "Regular", []),
      lineKey(2, "Large", []),
      lineKey(2, "Large", ["Extra shot"]),
    ]);
    cart = add(cart, coffee, "Large");
    expect(cart[1]?.quantity).toBe("2");
  });

  it("treats add-on order as irrelevant", () => {
    const item: PosItem = { ...coffee, addons: [{ name: "A", price: "1" }, { name: "B", price: "2" }] };
    expect(lineKey(item.id, null, ["A", "B"])).toBe(lineKey(item.id, null, ["B", "A"]));
  });

  it("steps up and down, and removes the line at zero", () => {
    let cart = add(add([], dosa), dosa);
    const key = cart[0]!.key;
    cart = cartReducer(cart, { type: "step", key, direction: -1 });
    expect(cart[0]?.quantity).toBe("1");
    cart = cartReducer(cart, { type: "step", key, direction: -1 });
    expect(cart).toEqual([]);
  });

  it("steps weighed items by half a unit", () => {
    let cart = add([], rice);
    cart = cartReducer(cart, { type: "step", key: cart[0]!.key, direction: 1 });
    expect(cart[0]?.quantity).toBe("1.5");
  });

  it("sets a typed quantity, rounds pieces, and removes on zero or junk", () => {
    const cart = add([], dosa);
    const key = cart[0]!.key;
    expect(cartReducer(cart, { type: "setQuantity", key, quantity: "5" })[0]?.quantity).toBe("5");
    expect(cartReducer(cart, { type: "setQuantity", key, quantity: "2.6" })[0]?.quantity).toBe("3");
    expect(cartReducer(cart, { type: "setQuantity", key, quantity: "0" })).toEqual([]);
    expect(cartReducer(cart, { type: "setQuantity", key, quantity: "abc" })).toEqual([]);
    const kg = add([], rice);
    expect(cartReducer(kg, { type: "setQuantity", key: kg[0]!.key, quantity: "0.7506" })[0]?.quantity).toBe("0.751");
  });

  it("sets line discounts, removes lines and clears", () => {
    let cart = add(add([], dosa), coffee, "Regular");
    cart = cartReducer(cart, { type: "setDiscount", key: cart[0]!.key, discount: "10" });
    expect(cart[0]?.discount).toBe("10");
    cart = cartReducer(cart, { type: "remove", key: cart[0]!.key });
    expect(cart).toHaveLength(1);
    expect(cartReducer(cart, { type: "clear" })).toEqual([]);
  });
});

describe("cartTotals", () => {
  it("prices variants and add-ons, then adds tax", () => {
    const cart = add([], coffee, "Large", ["Extra shot"]);
    expect(unitPriceOf(coffee, "Large", ["Extra shot"]).toFixed(2)).toBe("145.00");
    expect(cartTotals(cart, { ignoreTax: false, billDiscount: null }).grandTotal).toBe("152.26");
  });

  it("applies line and bill discounts", () => {
    let cart = add(add([], dosa), dosa);
    cart = cartReducer(cart, { type: "setDiscount", key: cart[0]!.key, discount: "20" });
    const totals = cartTotals(cart, { ignoreTax: false, billDiscount: { type: "percent", value: "10" } });
    expect(totals.totalDiscount).toBe("38.00");
    expect(totals.grandTotal).toBe("170.10");
  });

  it("is zero for an empty cart and when tax is ignored", () => {
    expect(cartTotals([], { ignoreTax: false, billDiscount: null }).grandTotal).toBe("0.00");
    expect(cartTotals(add([], dosa), { ignoreTax: true, billDiscount: null }).grandTotal).toBe("100.00");
  });
});

const single = (overrides: Partial<PaymentState> = {}): PaymentState => ({
  split: false, method: "cash", received: "", reference: "", rows: [], ...overrides,
});
const row = (method: "cash" | "card" | "upi" | "other", amount: string, id = Math.random().toString()) => ({ id, method, amount, reference: "" });

describe("resolvePayment: single method", () => {
  it("takes exact cash by default", () => {
    const result = resolvePayment(single(), "210.00");
    expect(result).toMatchObject({ valid: true, change: "0.00", cashTendered: null });
    expect(result.payments).toEqual([{ method: "cash", amount: "210.00", reference: null }]);
  });

  it("works out change when more cash is received", () => {
    const result = resolvePayment(single({ received: "500" }), "210.00");
    expect(result).toMatchObject({ valid: true, change: "290.00", cashTendered: "500.00" });
    expect(result.payments[0]?.amount).toBe("210.00");
  });

  it("is invalid when cash falls short", () => {
    expect(resolvePayment(single({ received: "100" }), "210.00")).toMatchObject({ valid: false, remaining: "110.00" });
  });

  it("charges the exact total to a card or UPI, with an optional reference", () => {
    const result = resolvePayment(single({ method: "upi", reference: " UPI123 " }), "210.00");
    expect(result.payments).toEqual([{ method: "upi", amount: "210.00", reference: "UPI123" }]);
  });

  it("needs no payment when the total is zero", () => {
    expect(resolvePayment(single({ received: "50" }), "0.00")).toMatchObject({ valid: true, payments: [] });
  });
});

describe("resolvePayment: split", () => {
  const split = (rows: ReturnType<typeof row>[]) => single({ split: true, rows });

  it("accepts amounts that add up exactly", () => {
    const result = resolvePayment(split([row("cash", "100"), row("upi", "110")]), "210.00");
    expect(result.valid).toBe(true);
    expect(result.payments.map((p) => p.amount)).toEqual(["100.00", "110.00"]);
    expect(result.change).toBe("0.00");
  });

  it("reports what is still to collect", () => {
    expect(resolvePayment(split([row("cash", "100")]), "210.00")).toMatchObject({ valid: false, remaining: "110.00" });
  });

  it("gives change out of the cash only", () => {
    const result = resolvePayment(split([row("upi", "110"), row("cash", "200")]), "210.00");
    expect(result.valid).toBe(true);
    expect(result.change).toBe("100.00");
    expect(result.cashTendered).toBe("200.00");
    expect(result.payments).toEqual([
      { method: "upi", amount: "110.00", reference: null },
      { method: "cash", amount: "100.00", reference: null },
    ]);
  });

  it("refuses change when the overpayment is not in cash", () => {
    expect(resolvePayment(split([row("card", "300")]), "210.00")).toMatchObject({ valid: false });
  });

  it("drops a cash row that ends up fully returned as change", () => {
    const result = resolvePayment(split([row("upi", "210"), row("cash", "50")]), "210.00");
    expect(result.valid).toBe(true);
    expect(result.payments).toEqual([{ method: "upi", amount: "210.00", reference: null }]);
    expect(result.change).toBe("50.00");
  });

  it("ignores blank rows", () => {
    expect(resolvePayment(split([row("cash", ""), row("card", "210")]), "210.00").payments).toHaveLength(1);
  });
});

describe("quickCashAmounts", () => {
  it("offers the exact amount first, then round figures above it", () => {
    expect(quickCashAmounts("210.00")).toEqual(["210.00", "250.00", "300.00", "500.00", "2000.00"]);
    expect(quickCashAmounts("187.00")).toEqual(["187.00", "190.00", "200.00", "500.00", "2000.00"]);
  });

  it("offers nothing for a zero total", () => {
    expect(quickCashAmounts("0.00")).toEqual([]);
  });
});
