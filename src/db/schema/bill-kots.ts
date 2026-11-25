import { index, integer, jsonb, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { bigId, bigRef, createdAt, ix, table } from "./_shared";
import { bills } from "./bills";
import { users } from "./users";

/** One line on a kitchen order ticket. Stored as a snapshot, so a reprint matches what was sent. */
export interface KotItem {
  name: string;
  quantity: string;
  /** Variant and add-ons, one per line. */
  details: string[];
}

/**
 * One row per time items were sent to the kitchen for a bill ("KOT #1", "KOT #2"...). It holds only
 * the items added since the previous one, so each slip shows just what is new.
 */
export const billKots = table(
  "bill_kots",
  {
    id: bigId(),
    billId: bigRef("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    /** 1 for the first send on this bill, then 2, 3... */
    seq: integer("seq").notNull(),
    items: jsonb("items").$type<KotItem[]>().notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex(ix("bill_kots_bill_seq_key")).on(t.billId, t.seq), index(ix("bill_kots_bill_idx")).on(t.billId)],
);

export type BillKotRow = typeof billKots.$inferSelect;
