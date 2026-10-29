import { index, numeric, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bigId, bigRef, createdAt, ix, table } from "./_shared";
import { menuItems } from "./menu-items";
import { suppliers } from "./suppliers";
import { users } from "./users";

export const purchases = table(
  "purchases",
  {
    id: bigId(),
    supplierId: bigRef("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    invoiceNo: text("invoice_no"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
    createdUserId: uuid("created_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index(ix("purchases_supplier_idx")).on(t.supplierId),
    index(ix("purchases_purchased_at_idx")).on(t.purchasedAt),
  ],
);

export const purchaseItems = table(
  "purchase_items",
  {
    id: bigId(),
    purchaseId: bigRef("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    menuItemId: bigRef("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "restrict" }),
    /** Item name at the time of purchase. */
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    index(ix("purchase_items_purchase_idx")).on(t.purchaseId),
    index(ix("purchase_items_menu_item_idx")).on(t.menuItemId),
  ],
);

export type PurchaseRow = typeof purchases.$inferSelect;
export type PurchaseItemRow = typeof purchaseItems.$inferSelect;
