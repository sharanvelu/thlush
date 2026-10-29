export type BillStatus = "completed" | "held" | "void" | "refunded";
export type OrderType = "dine_in" | "takeaway" | "delivery";
export type PaymentMethod = "cash" | "card" | "upi" | "other";
export type DiscountKind = "percent" | "flat";

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  other: "Other",
};

export interface BillDetailItem {
  id: number;
  menuItemId: number | null;
  name: string;
  /** Tax-exclusive unit price at the time of sale. */
  price: string;
  sgst: string;
  cgst: string;
  quantity: string;
  /** Line discount plus its share of the bill discount (line discount only on held bills). */
  discount: string;
  /** Final line amount including tax. */
  total: string;
  /** The variant and add-ons chosen on the billing screen, if any. */
  options: { variant?: string; addons?: Array<{ name: string; price: string }> } | null;
}

export interface BillDetailPayment {
  id: number;
  method: PaymentMethod;
  amount: string;
  reference: string | null;
}

/** A bill with everything needed to show or print it. Dates are ISO strings. */
export interface BillDetail {
  id: number;
  billNo: string;
  status: BillStatus;
  createdAt: string;
  currency: string;
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  totalAmount: string;
  discountType: DiscountKind | null;
  discountValue: string;
  amountPaid: string;
  changeDue: string;
  orderType: OrderType | null;
  tableNo: string | null;
  notes: string | null;
  voidReason: string | null;
  customer: { id: number; name: string; phone: string | null; email: string | null } | null;
  cashier: { id: string; name: string } | null;
  items: BillDetailItem[];
  payments: BillDetailPayment[];
}

export interface HeldBillSummary {
  id: number;
  createdAt: string;
  customerName: string | null;
  tableNo: string | null;
  itemCount: number;
  total: string;
}
