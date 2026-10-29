import { index, numeric, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import {
  bigId,
  bigRef,
  billStatus,
  createdAt,
  discountType,
  ix,
  orderType,
  table,
} from "./_shared";
import { customers } from "./customers";
import { users } from "./users";

export const bills = table(
  "bills",
  {
    id: bigId(),
    /** Human-facing number, e.g. INV-20261030-0007. Unique. */
    billNo: text("bill_no").notNull(),
    /** Null means walk-in (also set when the customer is later deleted). */
    customerId: bigRef("customer_id").references(() => customers.id, { onDelete: "set null" }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    /** Sum of line discounts and the bill-level discount. */
    totalDiscount: numeric("total_discount", { precision: 12, scale: 2 }).notNull().default("0"),
    totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("INR"),
    status: billStatus("status").notNull().default("completed"),
    orderType: orderType("order_type"),
    tableNo: text("table_no"),
    notes: text("notes"),
    /** How the bill-level discount was entered; the amount is in total_discount. */
    discountType: discountType("discount_type"),
    discountValue: numeric("discount_value", { precision: 12, scale: 2 }).notNull().default("0"),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    changeDue: numeric("change_due", { precision: 12, scale: 2 }).notNull().default("0"),
    heldAt: timestamp("held_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    /** Client-generated id for one save attempt, so a retried or double-clicked save returns the same bill. */
    clientRef: text("client_ref"),
    voidedBy: uuid("voided_by").references(() => users.id, { onDelete: "set null" }),
    createdUserId: uuid("created_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex(ix("bills_bill_no_key")).on(t.billNo),
    uniqueIndex(ix("bills_client_ref_key")).on(t.clientRef),
    index(ix("bills_created_at_idx")).on(t.createdAt),
    index(ix("bills_customer_idx")).on(t.customerId),
    index(ix("bills_created_user_idx")).on(t.createdUserId),
    index(ix("bills_status_idx")).on(t.status),
  ],
);

export type BillRow = typeof bills.$inferSelect;
export type NewBillRow = typeof bills.$inferInsert;
