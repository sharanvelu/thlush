import { db, schema, type DbExecutor } from "@/db";

export interface AuditEntry {
  userId?: string | null;
  /** Dotted verb, e.g. "login", "menu.create", "bill.void". */
  action: string;
  entity: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown>;
}

/**
 * Records who did what. Pass a transaction as `executor` when the entry must
 * commit or roll back together with the change it describes.
 *
 * Failures are logged and swallowed so that an audit hiccup never blocks a
 * sign-in. Services that need a hard guarantee should write inside their own
 * transaction and let the error propagate by calling `record` instead.
 */
export async function log(entry: AuditEntry, executor: DbExecutor = db): Promise<void> {
  try {
    await record(entry, executor);
  } catch (error) {
    console.error("[audit] failed to write entry", entry.action, error);
  }
}

/** Like `log`, but propagates errors. Use inside transactions. */
export async function record(entry: AuditEntry, executor: DbExecutor = db): Promise<void> {
  await executor.insert(schema.auditLogs).values({
    userId: entry.userId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId === undefined || entry.entityId === null ? null : String(entry.entityId),
    metadata: entry.metadata ?? null,
  });
}
