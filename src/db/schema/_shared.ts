import { bigint, pgEnum, pgTableCreator, timestamp } from "drizzle-orm/pg-core";
import { prefixed } from "../prefix";

/** Every table is created through this so the configured prefix is applied. */
export const table = pgTableCreator((name) => prefixed(name));

/** Prefixed names for indexes and constraints, so two installs never collide. */
export const ix = (name: string): string => prefixed(name);

export const userRole = pgEnum(prefixed("user_role"), ["super_admin", "manager", "billing"]);
export const entityStatus = pgEnum(prefixed("entity_status"), ["active", "disabled"]);
export const billStatus = pgEnum(prefixed("bill_status"), [
  "completed",
  "held",
  "void",
  "refunded",
]);
export const orderType = pgEnum(prefixed("order_type"), ["dine_in", "takeaway", "delivery"]);
export const paymentMethod = pgEnum(prefixed("payment_method"), ["cash", "card", "upi", "other"]);
export const discountType = pgEnum(prefixed("discount_type"), ["percent", "flat"]);
export const stockReason = pgEnum(prefixed("stock_reason"), [
  "purchase",
  "wastage",
  "damage",
  "correction",
  "return",
  "sale",
  "void",
  "refund",
]);

/** `bigint generated always as identity` primary key, exposed as a JS number. */
export const bigId = () => bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();

/** Foreign-key column pointing at a bigint identity id. */
export const bigRef = (name: string) => bigint(name, { mode: "number" });

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
