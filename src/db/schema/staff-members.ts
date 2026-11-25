import { sql } from "drizzle-orm";
import { boolean, text, uniqueIndex } from "drizzle-orm/pg-core";
import { bigId, createdAt, entityStatus, ix, table, updatedAt } from "./_shared";

/**
 * The people who work at the counter (cashiers, cooks, chefs, ...). They are not accounts: nobody signs in
 * as one. A shared Counter login is used on the till, and the cashier is chosen on each bill.
 */
export const staffMembers = table(
  "staff_members",
  {
    id: bigId(),
    name: text("name").notNull(),
    /** Free text shown next to the name, e.g. "Cashier" or "Chef". */
    title: text("title"),
    /** Can be picked as the cashier on a bill. */
    isCashier: boolean("is_cashier").notNull().default(true),
    status: entityStatus("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex(ix("staff_members_name_key")).on(sql`lower(${t.name})`)],
);

export type StaffMemberRow = typeof staffMembers.$inferSelect;
