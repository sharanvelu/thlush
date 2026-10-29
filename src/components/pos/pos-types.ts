import type { OrderType } from "@/types/bill";

export type CustomerChoice =
  | { kind: "walkin" }
  | { kind: "existing"; id: number; name: string; phone: string | null; email: string | null }
  | { kind: "new"; name: string; phone: string };

/** Everything on the bill except the lines and the payment. */
export interface BillDetailsDraft {
  customer: CustomerChoice;
  orderType: OrderType | null;
  tableNo: string;
  notes: string;
  discountKind: "percent" | "flat";
  discountValue: string;
}

export const EMPTY_DETAILS: BillDetailsDraft = {
  customer: { kind: "walkin" },
  orderType: null,
  tableNo: "",
  notes: "",
  discountKind: "percent",
  discountValue: "",
};

/** The business settings the billing screen needs. */
export interface PosSettings {
  currency: string;
  locale: string;
  ignoreTax: boolean;
  discountsEnabled: boolean;
  orderTypesEnabled: boolean;
  blockOutOfStock: boolean;
  /** Label for a bill with no customer. */
  walkInLabel: string;
}
