import { index, jsonb, numeric, text } from "drizzle-orm/pg-core";
import { bigId, bigRef, ix, table } from "./_shared";
import { bills } from "./bills";
import { menuItems } from "./menu-items";

export interface BillItemOptions {
  variant?: string;
  addons?: Array<{ name: string; price: string }>;
}

/**
 * One row per bill line. `name`, `price`, `sgst` and `cgst` are a snapshot taken
 * at sale time, so later menu edits never change an old bill.
 */
export const billItems = table(
  "bill_items",
  {
    id: bigId(),
    billId: bigRef("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    /** Set to null if the menu item is ever hard-deleted; the snapshot remains. */
    menuItemId: bigRef("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    sgst: numeric("sgst", { precision: 5, scale: 2 }).notNull().default("0"),
    cgst: numeric("cgst", { precision: 5, scale: 2 }).notNull().default("0"),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    /** Line discount plus this line's share of the bill-level discount. */
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    /** Final line amount including tax. */
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    options: jsonb("options").$type<BillItemOptions>(),
  },
  (t) => [
    index(ix("bill_items_bill_idx")).on(t.billId),
    index(ix("bill_items_name_idx")).on(t.name),
    index(ix("bill_items_menu_item_idx")).on(t.menuItemId),
  ],
);

export type BillItemRow = typeof billItems.$inferSelect;
export type NewBillItemRow = typeof billItems.$inferInsert;
