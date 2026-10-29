import { index, numeric, text, uuid } from "drizzle-orm/pg-core";
import { bigId, bigRef, createdAt, ix, stockReason, table } from "./_shared";
import { bills } from "./bills";
import { menuItems } from "./menu-items";
import { users } from "./users";

/**
 * Append-only stock ledger. Rows are only ever inserted; corrections are made
 * with a new row. `StockService` exposes no update or delete.
 */
export const stockMovements = table(
  "stock_movements",
  {
    id: bigId(),
    menuItemId: bigRef("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "restrict" }),
    /** Positive adds stock, negative removes it. */
    delta: numeric("delta", { precision: 12, scale: 3 }).notNull(),
    reason: stockReason("reason").notNull(),
    billId: bigRef("bill_id").references(() => bills.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    /** Stock on hand immediately after this movement. */
    balanceAfter: numeric("balance_after", { precision: 12, scale: 3 }),
    createdAt: createdAt(),
  },
  (t) => [
    index(ix("stock_movements_item_idx")).on(t.menuItemId, t.createdAt),
    index(ix("stock_movements_bill_idx")).on(t.billId),
  ],
);

export type StockMovementRow = typeof stockMovements.$inferSelect;
export type NewStockMovementRow = typeof stockMovements.$inferInsert;
