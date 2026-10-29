import { index, numeric, text } from "drizzle-orm/pg-core";
import { bigId, bigRef, createdAt, ix, paymentMethod, table } from "./_shared";
import { bills } from "./bills";

/** A bill can have several rows when the customer splits the payment. */
export const payments = table(
  "payments",
  {
    id: bigId(),
    billId: bigRef("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    method: paymentMethod("method").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    /** Card slip, UPI transaction id, etc. */
    reference: text("reference"),
    createdAt: createdAt(),
  },
  (t) => [index(ix("payments_bill_idx")).on(t.billId)],
);

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
