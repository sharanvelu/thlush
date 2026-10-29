import { sql } from "drizzle-orm";
import { index, text } from "drizzle-orm/pg-core";
import { bigId, createdAt, ix, table, updatedAt } from "./_shared";

export const customers = table(
  "customers",
  {
    id: bigId(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index(ix("customers_name_idx")).on(sql`lower(${t.name})`),
    index(ix("customers_phone_idx")).on(t.phone),
  ],
);

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
