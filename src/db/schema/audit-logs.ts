import { index, jsonb, text, uuid } from "drizzle-orm/pg-core";
import { bigId, createdAt, ix, table } from "./_shared";
import { users } from "./users";

export const auditLogs = table(
  "audit_logs",
  {
    id: bigId(),
    /** Null for system actions or after the user has been deleted. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Dotted verb, e.g. "login", "menu.create", "bill.void". */
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index(ix("audit_logs_user_idx")).on(t.userId, t.createdAt),
    index(ix("audit_logs_entity_idx")).on(t.entity, t.entityId),
    index(ix("audit_logs_created_at_idx")).on(t.createdAt),
  ],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
