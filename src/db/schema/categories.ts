import { sql } from "drizzle-orm";
import { index, integer, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { bigId, createdAt, entityStatus, ix, table, updatedAt } from "./_shared";
import { users } from "./users";

export const categories = table(
  "categories",
  {
    id: bigId(),
    name: text("name").notNull(),
    description: text("description"),
    status: entityStatus("status").notNull().default("active"),
    /** Position in the POS category tabs; lower comes first. */
    sortOrder: integer("sort_order").notNull().default(0),
    color: text("color"),
    icon: text("icon"),
    createdUserId: uuid("created_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex(ix("categories_name_key")).on(sql`lower(${t.name})`),
    index(ix("categories_sort_idx")).on(t.sortOrder),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
