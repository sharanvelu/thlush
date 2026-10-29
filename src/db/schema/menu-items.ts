import {
  boolean,
  index,
  jsonb,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { bigId, bigRef, createdAt, entityStatus, ix, table, updatedAt } from "./_shared";
import { categories } from "./categories";
import { users } from "./users";

export interface MenuVariant {
  name: string;
  /** Amount added to (or, if negative, taken off) the base price. */
  priceDelta: string;
}

export interface MenuAddon {
  name: string;
  price: string;
}

export const menuItems = table(
  "menu_items",
  {
    id: bigId(),
    name: text("name").notNull(),
    description: text("description"),
    /** Deleting a category that still has items is blocked, not cascaded. */
    categoryId: bigRef("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** Tax-exclusive unit price. */
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    sgst: numeric("sgst", { precision: 5, scale: 2 }).notNull().default("0"),
    cgst: numeric("cgst", { precision: 5, scale: 2 }).notNull().default("0"),
    /** ISO 4217 code (not a symbol), so items and bills agree. */
    currency: text("currency").notNull().default("INR"),
    status: entityStatus("status").notNull().default("active"),
    sku: text("sku"),
    imageUrl: text("image_url"),
    unit: text("unit").notNull().default("pcs"),
    /** True = veg, false = non-veg, null = not applicable. */
    isVeg: boolean("is_veg"),
    variants: jsonb("variants").$type<MenuVariant[]>().notNull().default([]),
    addons: jsonb("addons").$type<MenuAddon[]>().notNull().default([]),
    trackStock: boolean("track_stock").notNull().default(false),
    stockQty: numeric("stock_qty", { precision: 12, scale: 3 }).notNull().default("0"),
    reorderLevel: numeric("reorder_level", { precision: 12, scale: 3 }).notNull().default("0"),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"),
    createdUserId: uuid("created_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    /** Soft delete: billed items are hidden, never removed, so history stays intact. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique(ix("menu_items_sku_key")).on(t.sku),
    index(ix("menu_items_category_idx")).on(t.categoryId),
    index(ix("menu_items_status_idx")).on(t.status),
    index(ix("menu_items_name_idx")).on(t.name),
  ],
);

export type MenuItemRow = typeof menuItems.$inferSelect;
export type NewMenuItemRow = typeof menuItems.$inferInsert;
