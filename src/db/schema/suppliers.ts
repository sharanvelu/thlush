import { text } from "drizzle-orm/pg-core";
import { bigId, createdAt, entityStatus, table, updatedAt } from "./_shared";

export const suppliers = table("suppliers", {
  id: bigId(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  status: entityStatus("status").notNull().default("active"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type SupplierRow = typeof suppliers.$inferSelect;
export type NewSupplierRow = typeof suppliers.$inferInsert;
