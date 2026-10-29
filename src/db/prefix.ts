/**
 * Table-name prefix, shared by the Drizzle schema, migrations and `src/config.ts`.
 * Lives in its own dependency-free file so drizzle-kit can import it without
 * resolving path aliases. Override with the optional DB_TABLE_PREFIX env var.
 */
const raw = process.env.DB_TABLE_PREFIX?.trim();

export const tablePrefix: string = raw && raw.length > 0 ? raw : "app_";

if (!/^[a-z][a-z0-9_]*$/.test(tablePrefix)) {
  throw new Error(
    `Invalid DB_TABLE_PREFIX "${tablePrefix}". Use lowercase letters, digits and underscores, starting with a letter.`,
  );
}

/** Prefixes a table, enum or index name. */
export const prefixed = (name: string): string => `${tablePrefix}${name}`;
