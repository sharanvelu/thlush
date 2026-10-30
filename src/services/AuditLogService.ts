import { and, desc, eq, gte, ilike, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { zonedDayRange } from "@/lib/dates";
import type { AuditQuery } from "@/lib/validation/audit";
import { likePattern } from "@/services/CategoryService";

const { auditLogs, users } = schema;

export interface AuditRow {
  id: number;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
}

export async function listAuditLogs(query: Omit<AuditQuery, "pageSize" | "page"> & { page: number; pageSize: number }, timeZone: string) {
  const { start, end } = zonedDayRange(query.from, query.to, timeZone);
  const where = and(
    query.user ? eq(auditLogs.userId, query.user) : undefined,
    query.entity ? eq(auditLogs.entity, query.entity) : undefined,
    query.action ? ilike(auditLogs.action, likePattern(query.action)) : undefined,
    start ? gte(auditLogs.createdAt, start) : undefined,
    end ? lt(auditLogs.createdAt, end) : undefined,
  );
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userName: users.name,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(auditLogs).where(where),
  ]);
  return {
    rows: rows.map((r): AuditRow => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: totals[0]?.n ?? 0,
  };
}

/** The entity types that appear in the log, for the filter dropdown. */
export async function listAuditEntities(): Promise<string[]> {
  const rows = await db.selectDistinct({ entity: auditLogs.entity }).from(auditLogs).orderBy(auditLogs.entity).limit(100);
  return rows.map((r) => r.entity);
}
