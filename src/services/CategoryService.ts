import { and, asc, eq, getTableColumns, ilike, inArray, isNull, max, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import type { CategoryData, CategoryListQuery, CategoryPatch } from "@/lib/validation/category";
import * as AuditService from "@/services/AuditService";

const { categories, menuItems } = schema;

export interface CategoryListItem {
  id: number;
  name: string;
  description: string | null;
  status: "active" | "disabled";
  sortOrder: number;
  color: string | null;
  icon: string | null;
  /** Menu items in this category, not counting archived (soft-deleted) ones. */
  itemCount: number;
  createdAt: Date;
}

export interface CategoryOption {
  id: number;
  name: string;
  status: "active" | "disabled";
  color: string | null;
  icon: string | null;
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function likePattern(input: string): string {
  return `%${input.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listCategories(
  query: Partial<CategoryListQuery> = {},
): Promise<{ rows: CategoryListItem[]; total: number }> {
  const { q, status = "all", page = 1, pageSize = 100 } = query;

  const conditions: SQL[] = [];
  if (q) conditions.push(ilike(categories.name, likePattern(q)));
  if (status !== "all") conditions.push(eq(categories.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        ...getTableColumns(categories),
        itemCount: sql<number>`count(${menuItems.id}) filter (where ${menuItems.deletedAt} is null)`.mapWith(Number),
      })
      .from(categories)
      .leftJoin(menuItems, eq(menuItems.categoryId, categories.id))
      .where(where)
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(categories).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      sortOrder: r.sortOrder,
      color: r.color,
      icon: r.icon,
      itemCount: r.itemCount,
      createdAt: r.createdAt,
    })),
    total: totalRows[0]?.n ?? 0,
  };
}

/** Lightweight list for dropdowns. Bounded, ordered like the POS tabs. */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      status: categories.status,
      color: categories.color,
      icon: categories.icon,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .limit(500);
}

export async function getCategory(id: number): Promise<CategoryListItem> {
  const [row] = await db
    .select({
      ...getTableColumns(categories),
      itemCount: sql<number>`count(${menuItems.id}) filter (where ${menuItems.deletedAt} is null)`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(menuItems, eq(menuItems.categoryId, categories.id))
    .where(eq(categories.id, id))
    .groupBy(categories.id);
  if (!row) throw HttpError.notFound("Category not found.");
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    color: row.color,
    icon: row.icon,
    itemCount: row.itemCount,
    createdAt: row.createdAt,
  };
}

const nameTaken = () => HttpError.conflict("A category with this name already exists.");

export async function createCategory(input: CategoryData, userId: string): Promise<CategoryListItem> {
  try {
    const id = await db.transaction(async (tx) => {
      const [{ top } = { top: null }] = await tx.select({ top: max(categories.sortOrder) }).from(categories);
      const [created] = await tx
        .insert(categories)
        .values({
          name: input.name,
          description: input.description,
          status: input.status,
          color: input.color,
          icon: input.icon,
          sortOrder: (top ?? -1) + 1,
          createdUserId: userId,
        })
        .returning({ id: categories.id });
      if (!created) throw new Error("Category insert returned no row");
      await AuditService.record(
        { userId, action: "category.create", entity: "category", entityId: created.id, metadata: { name: input.name } },
        tx,
      );
      return created.id;
    });
    return getCategory(id);
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken();
    throw error;
  }
}

export async function updateCategory(id: number, patch: CategoryPatch, userId: string): Promise<CategoryListItem> {
  const values: Partial<typeof categories.$inferInsert> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.color !== undefined) values.color = patch.color;
  if (patch.icon !== undefined) values.icon = patch.icon;

  try {
    await db.transaction(async (tx) => {
      const [updated] =
        Object.keys(values).length > 0
          ? await tx.update(categories).set(values).where(eq(categories.id, id)).returning({ id: categories.id })
          : await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
      if (!updated) throw HttpError.notFound("Category not found.");
      await AuditService.record(
        { userId, action: "category.update", entity: "category", entityId: id, metadata: { fields: Object.keys(values) } },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw nameTaken();
    throw error;
  }
  return getCategory(id);
}

/**
 * Deletes a category only when nothing references it. Items, including archived
 * ones, block deletion: billed items are kept for history and still need a category.
 */
export async function deleteCategory(id: number, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [category] = await tx.select().from(categories).where(eq(categories.id, id)).for("update");
    if (!category) throw HttpError.notFound("Category not found.");

    const [live] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(menuItems)
      .where(and(eq(menuItems.categoryId, id), isNull(menuItems.deletedAt)));
    if ((live?.n ?? 0) > 0) {
      const n = live?.n ?? 0;
      throw HttpError.conflict(`This category has ${n} item${n === 1 ? "" : "s"}. Move or delete them first.`);
    }

    const [archived] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(menuItems)
      .where(eq(menuItems.categoryId, id));
    if ((archived?.n ?? 0) > 0) {
      throw HttpError.conflict(
        "This category still holds archived items kept for bill history. Disable the category instead of deleting it.",
      );
    }

    await tx.delete(categories).where(eq(categories.id, id));
    await AuditService.record(
      { userId, action: "category.delete", entity: "category", entityId: id, metadata: { name: category.name } },
      tx,
    );
  });
}

/** Stores the order shown in the POS tabs: position in `ids` becomes the sort order. */
export async function reorderCategories(ids: number[], userId: string): Promise<void> {
  const unique = [...new Set(ids)];
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: categories.id }).from(categories).where(inArray(categories.id, unique));
    if (existing.length !== unique.length) throw HttpError.badRequest("One or more categories no longer exist.");

    // One statement: set sort_order from the position of each id in the supplied list.
    const cases = sql.join(
      unique.map((id, index) => sql`when ${id}::bigint then ${index}::int`),
      sql` `,
    );
    await tx
      .update(categories)
      .set({ sortOrder: sql`case ${categories.id} ${cases} end` })
      .where(inArray(categories.id, unique));

    await AuditService.record(
      { userId, action: "category.reorder", entity: "category", metadata: { order: unique } },
      tx,
    );
  });
}
