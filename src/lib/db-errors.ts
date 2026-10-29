interface PgErrorLike {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

/** Postgres error details, unwrapping Drizzle's query error wrapper if present. */
function pgError(error: unknown): PgErrorLike | null {
  if (typeof error !== "object" || error === null) return null;
  const e = error as PgErrorLike;
  if (typeof e.code === "string") return e;
  return pgError(e.cause);
}

export function isUniqueViolation(error: unknown, constraintContains?: string): boolean {
  const e = pgError(error);
  if (!e || e.code !== "23505") return false;
  if (!constraintContains) return true;
  return typeof e.constraint === "string" && e.constraint.includes(constraintContains);
}

export function isForeignKeyViolation(error: unknown): boolean {
  return pgError(error)?.code === "23503";
}
