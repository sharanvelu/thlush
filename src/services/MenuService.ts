import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, schema, type DbExecutor } from "@/db";
import { toCsv, parseCsv, unescapeCell } from "@/lib/csv";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import { HttpError } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import {
  menuItemSchema,
  type MenuBulkInput,
  type MenuItemData,
  type MenuItemPatch,
  type MenuListQuery,
} from "@/lib/validation/menu";
import * as AuditService from "@/services/AuditService";
import { likePattern } from "@/services/CategoryService";
import { getSettings } from "@/services/SettingsService";
import type { MenuAddon, MenuVariant } from "@/db/schema";

const { menuItems, categories, billItems, stockMovements, purchaseItems } = schema;

export interface MenuListItem {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  categoryStatus: "active" | "disabled";
  categoryColor: string | null;
  categoryIcon: string | null;
  price: string;
  sgst: string;
  cgst: string;
  currency: string;
  status: "active" | "disabled";
  sku: string | null;
  /** URL to show the photo, or null. Stored photos are served by the image route. */
  imageSrc: string | null;
  isVeg: boolean | null;
  variants: MenuVariant[];
  addons: MenuAddon[];
  unit: string;
  trackStock: boolean;
  /** Stock on hand. Only meaningful when `trackStock` is true. */
  stockQty: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MenuFilters = Pick<MenuListQuery, "q" | "category" | "status">;

const SORT_COLUMNS = {
  name: sql`lower(${menuItems.name})`,
  category: sql`lower(${categories.name})`,
  price: menuItems.price,
  status: menuItems.status,
  created: menuItems.createdAt,
} as const;

function filterConditions(filters: MenuFilters): SQL[] {
  const conditions: SQL[] = [isNull(menuItems.deletedAt)];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    const match = or(ilike(menuItems.name, pattern), ilike(menuItems.sku, pattern), ilike(categories.name, pattern));
    if (match) conditions.push(match);
  }
  if (filters.category) conditions.push(eq(menuItems.categoryId, filters.category));
  if (filters.status && filters.status !== "all") conditions.push(eq(menuItems.status, filters.status));
  return conditions;
}

/**
 * Columns for list views. The photo itself is never selected here: data URLs can
 * be ~100 KB each, so we only learn whether one exists and link to the image route.
 */
const listColumns = () => {
  const { imageUrl: _imageUrl, reorderLevel: _r, costPrice: _c, deletedAt: _d, createdUserId: _u, ...rest } =
    getTableColumns(menuItems);
  return {
    ...rest,
    categoryName: categories.name,
    categoryStatus: categories.status,
    categoryColor: categories.color,
    categoryIcon: categories.icon,
    externalImage: sql<string | null>`case when ${menuItems.imageUrl} like 'https://%' then ${menuItems.imageUrl} end`,
    hasStoredImage: sql<boolean>`(${menuItems.imageUrl} like 'data:%')`,
  };
};

type ListRow = Awaited<ReturnType<typeof selectList>>[number];

function selectList(where: SQL | undefined, orderBy: SQL[], limit?: number, offset?: number) {
  const query = db
    .select(listColumns())
    .from(menuItems)
    .innerJoin(categories, eq(categories.id, menuItems.categoryId))
    .where(where)
    .orderBy(...orderBy);
  return limit === undefined ? query : query.limit(limit).offset(offset ?? 0);
}

function toListItem(row: ListRow): MenuListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryStatus: row.categoryStatus,
    categoryColor: row.categoryColor,
    categoryIcon: row.categoryIcon,
    price: row.price,
    sgst: row.sgst,
    cgst: row.cgst,
    currency: row.currency,
    status: row.status,
    sku: row.sku,
    imageSrc: row.externalImage ?? (row.hasStoredImage ? `/api/menu/${row.id}/image?v=${row.updatedAt.getTime()}` : null),
    isVeg: row.isVeg,
    variants: row.variants,
    addons: row.addons,
    unit: row.unit,
    trackStock: row.trackStock,
    stockQty: row.stockQty,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface MenuListResult {
  rows: MenuListItem[];
  total: number;
  /** Items per category across all pages (same filters). Only filled when grouped. */
  groupTotals: Record<number, number>;
}

export async function listMenuItems(
  query: MenuFilters & Pick<MenuListQuery, "sort" | "dir" | "page" | "pageSize"> & Partial<Pick<MenuListQuery, "group">>,
): Promise<MenuListResult> {
  const where = and(...filterConditions(query));
  const direction = query.dir === "desc" ? desc : asc;
  const grouped = query.group === "category";
  // Within groups the category column is constant, so "sort by category" falls back to name.
  const sortKey = grouped && query.sort === "category" ? "name" : query.sort;
  const orderBy = grouped
    ? [
        // Same order as the POS category tabs, then the chosen sort inside each group.
        asc(categories.sortOrder),
        asc(sql`lower(${categories.name})`),
        direction(SORT_COLUMNS[sortKey]),
        asc(menuItems.id),
      ]
    : [direction(SORT_COLUMNS[sortKey]), asc(menuItems.id)];

  const countsQuery = grouped
    ? db
        .select({ categoryId: menuItems.categoryId, n: sql<number>`count(*)`.mapWith(Number) })
        .from(menuItems)
        .innerJoin(categories, eq(categories.id, menuItems.categoryId))
        .where(where)
        .groupBy(menuItems.categoryId)
    : Promise.resolve([] as Array<{ categoryId: number; n: number }>);

  const [rows, totalRows, counts] = await Promise.all([
    selectList(where, orderBy, query.pageSize, (query.page - 1) * query.pageSize),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(menuItems)
      .innerJoin(categories, eq(categories.id, menuItems.categoryId))
      .where(where),
    countsQuery,
  ]);
  return {
    rows: rows.map(toListItem),
    total: totalRows[0]?.n ?? 0,
    groupTotals: Object.fromEntries(counts.map((c) => [c.categoryId, c.n])),
  };
}

/**
 * Everything the billing screen can show: all live items in active categories,
 * in POS tab order. Disabled items are included so the screen can grey them out.
 */
export async function listCatalogForPos(): Promise<MenuListItem[]> {
  const rows = await selectList(
    and(isNull(menuItems.deletedAt), eq(categories.status, "active")),
    [asc(categories.sortOrder), asc(sql`lower(${categories.name})`), asc(sql`lower(${menuItems.name})`)],
    5000,
    0,
  );
  return rows.map(toListItem);
}

export async function getMenuItem(id: number, executor: DbExecutor = db): Promise<MenuListItem> {
  const [row] = await executor
    .select(listColumns())
    .from(menuItems)
    .innerJoin(categories, eq(categories.id, menuItems.categoryId))
    .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)));
  if (!row) throw HttpError.notFound("Menu item not found.");
  return toListItem(row);
}

/** The stored photo, for the image route. Returns null when there is none. */
export async function getMenuItemImage(
  id: number,
): Promise<{ type: "redirect"; url: string } | { type: "bytes"; contentType: string; bytes: Buffer } | null> {
  const [row] = await db
    .select({ imageUrl: menuItems.imageUrl })
    .from(menuItems)
    .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)));
  const url = row?.imageUrl;
  if (!url) return null;
  if (url.startsWith("https://")) return { type: "redirect", url };
  const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(url);
  if (!match?.[1] || !match[2]) return null;
  return { type: "bytes", contentType: match[1], bytes: Buffer.from(match[2], "base64") };
}

function skuTaken() {
  return new HttpError(409, "This SKU is already used by another item.", { sku: ["This SKU is already in use."] });
}
function badCategory() {
  return new HttpError(422, "That category no longer exists.", { categoryId: ["Choose a valid category."] });
}

export async function createMenuItem(input: MenuItemData, userId: string): Promise<MenuListItem> {
  const settings = await getSettings();
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(menuItems)
        .values({
          name: input.name,
          description: input.description,
          categoryId: input.categoryId,
          price: parseMoney(input.price),
          sgst: input.sgst,
          cgst: input.cgst,
          currency: input.currency ?? settings.locale.currency,
          status: input.status,
          sku: input.sku,
          imageUrl: input.imageUrl,
          isVeg: input.isVeg,
          variants: input.variants,
          addons: input.addons,
          createdUserId: userId,
        })
        .returning({ id: menuItems.id });
      if (!created) throw new Error("Menu item insert returned no row");
      await AuditService.record(
        { userId, action: "menu.create", entity: "menu_item", entityId: created.id, metadata: { name: input.name } },
        tx,
      );
      return created.id;
    });
    return getMenuItem(id);
  } catch (error) {
    if (isUniqueViolation(error)) throw skuTaken();
    if (isForeignKeyViolation(error)) throw badCategory();
    throw error;
  }
}

export async function updateMenuItem(id: number, patch: MenuItemPatch, userId: string): Promise<MenuListItem> {
  const values: Partial<typeof menuItems.$inferInsert> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.categoryId !== undefined) values.categoryId = patch.categoryId;
  if (patch.price !== undefined) values.price = parseMoney(patch.price);
  if (patch.sgst !== undefined) values.sgst = patch.sgst;
  if (patch.cgst !== undefined) values.cgst = patch.cgst;
  if (patch.currency !== undefined) values.currency = patch.currency;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.sku !== undefined) values.sku = patch.sku;
  if (patch.imageUrl !== undefined) values.imageUrl = patch.imageUrl;
  if (patch.isVeg !== undefined) values.isVeg = patch.isVeg;
  if (patch.variants !== undefined) values.variants = patch.variants;
  if (patch.addons !== undefined) values.addons = patch.addons;

  try {
    await db.transaction(async (tx) => {
      const where = and(eq(menuItems.id, id), isNull(menuItems.deletedAt));
      const [updated] =
        Object.keys(values).length > 0
          ? await tx.update(menuItems).set(values).where(where).returning({ id: menuItems.id })
          : await tx.select({ id: menuItems.id }).from(menuItems).where(where);
      if (!updated) throw HttpError.notFound("Menu item not found.");
      await AuditService.record(
        { userId, action: "menu.update", entity: "menu_item", entityId: id, metadata: { fields: Object.keys(values) } },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw skuTaken();
    if (isForeignKeyViolation(error)) throw badCategory();
    throw error;
  }
  return getMenuItem(id);
}

/** Copies an item. The copy is disabled and has no SKU, so it never reaches the POS half-edited. */
export async function duplicateMenuItem(id: number, userId: string): Promise<MenuListItem> {
  const newId = await db.transaction(async (tx) => {
    const [source] = await tx
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)));
    if (!source) throw HttpError.notFound("Menu item not found.");

    const [copy] = await tx
      .insert(menuItems)
      .values({
        name: `${source.name} (copy)`.slice(0, 120),
        description: source.description,
        categoryId: source.categoryId,
        price: source.price,
        sgst: source.sgst,
        cgst: source.cgst,
        currency: source.currency,
        status: "disabled",
        sku: null,
        imageUrl: source.imageUrl,
        unit: source.unit,
        isVeg: source.isVeg,
        variants: source.variants,
        addons: source.addons,
        trackStock: source.trackStock,
        reorderLevel: source.reorderLevel,
        costPrice: source.costPrice,
        createdUserId: userId,
      })
      .returning({ id: menuItems.id });
    if (!copy) throw new Error("Duplicate insert returned no row");
    await AuditService.record(
      { userId, action: "menu.duplicate", entity: "menu_item", entityId: copy.id, metadata: { from: id } },
      tx,
    );
    return copy.id;
  });
  return getMenuItem(newId);
}

/** Ids among `ids` that bills, stock history or purchases refer to. These must be archived, not removed. */
async function referencedIds(ids: number[], tx: DbExecutor): Promise<Set<number>> {
  const [fromBills, fromStock, fromPurchases] = await Promise.all([
    tx.selectDistinct({ id: billItems.menuItemId }).from(billItems).where(inArray(billItems.menuItemId, ids)),
    tx.selectDistinct({ id: stockMovements.menuItemId }).from(stockMovements).where(inArray(stockMovements.menuItemId, ids)),
    tx.selectDistinct({ id: purchaseItems.menuItemId }).from(purchaseItems).where(inArray(purchaseItems.menuItemId, ids)),
  ]);
  const used = new Set<number>();
  for (const row of [...fromBills, ...fromStock, ...fromPurchases]) if (row.id !== null) used.add(row.id);
  return used;
}

export type DeleteMode = "deleted" | "archived";

/**
 * Removes items. Anything that has been billed (or has stock or purchase history)
 * is archived instead: hidden from the menu and POS, disabled, SKU released, but
 * kept so old bills and the stock ledger stay intact.
 */
async function removeItems(
  ids: number[],
  userId: string,
  tx: DbExecutor,
): Promise<{ deleted: number; archived: number }> {
  const live = await tx
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(inArray(menuItems.id, ids), isNull(menuItems.deletedAt)));
  const liveIds = live.map((r) => r.id);
  if (liveIds.length === 0) return { deleted: 0, archived: 0 };

  const used = await referencedIds(liveIds, tx);
  const toArchive = liveIds.filter((id) => used.has(id));
  const toDelete = liveIds.filter((id) => !used.has(id));

  if (toDelete.length > 0) await tx.delete(menuItems).where(inArray(menuItems.id, toDelete));
  if (toArchive.length > 0) {
    await tx
      .update(menuItems)
      .set({ deletedAt: new Date(), status: "disabled", sku: null })
      .where(inArray(menuItems.id, toArchive));
  }
  await AuditService.record(
    {
      userId,
      action: "menu.delete",
      entity: "menu_item",
      entityId: liveIds.length === 1 ? liveIds[0] : null,
      metadata: { deleted: toDelete, archived: toArchive },
    },
    tx,
  );
  return { deleted: toDelete.length, archived: toArchive.length };
}

export async function deleteMenuItem(id: number, userId: string): Promise<{ mode: DeleteMode }> {
  const result = await db.transaction((tx) => removeItems([id], userId, tx));
  if (result.deleted + result.archived === 0) throw HttpError.notFound("Menu item not found.");
  return { mode: result.archived > 0 ? "archived" : "deleted" };
}

export interface BulkResult {
  affected: number;
  archived: number;
}

export async function bulkUpdateMenuItems(input: MenuBulkInput, userId: string): Promise<BulkResult> {
  const ids = [...new Set(input.ids)];

  if (input.action === "delete") {
    const result = await db.transaction((tx) => removeItems(ids, userId, tx));
    return { affected: result.deleted + result.archived, archived: result.archived };
  }

  try {
    const affected = await db.transaction(async (tx) => {
      const where = and(inArray(menuItems.id, ids), isNull(menuItems.deletedAt));
      const values: Partial<typeof menuItems.$inferInsert> =
        input.action === "enable"
          ? { status: "active" }
          : input.action === "disable"
            ? { status: "disabled" }
            : { categoryId: input.categoryId };
      const updated = await tx.update(menuItems).set(values).where(where).returning({ id: menuItems.id });
      await AuditService.record(
        {
          userId,
          action: `menu.bulk_${input.action}`,
          entity: "menu_item",
          metadata: { ids: updated.map((r) => r.id), ...(input.action === "move" ? { categoryId: input.categoryId } : {}) },
        },
        tx,
      );
      return updated.length;
    });
    return { affected, archived: 0 };
  } catch (error) {
    if (isForeignKeyViolation(error)) throw badCategory();
    throw error;
  }
}

// ---------------------------------------------------------------------------
// CSV export and import
// ---------------------------------------------------------------------------

const CSV_HEADER = ["Name", "Category", "Price", "SGST %", "CGST %", "Currency", "Status", "SKU", "Type", "Description"];
const EXPORT_LIMIT = 10_000;

/** CSV of the items matching the filters (the same ones the list uses). */
export async function exportMenuCsv(filters: MenuFilters): Promise<string> {
  const rows = await selectList(and(...filterConditions(filters)), [
    asc(sql`lower(${categories.name})`),
    asc(sql`lower(${menuItems.name})`),
  ], EXPORT_LIMIT, 0);
  return toCsv([
    CSV_HEADER,
    ...rows.map((r) => [
      r.name,
      r.categoryName,
      r.price,
      r.sgst,
      r.cgst,
      r.currency,
      r.status,
      r.sku,
      r.isVeg === null ? "" : r.isVeg ? "Veg" : "Non-veg",
      r.description,
    ]),
  ]);
}

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  /** Categories in the file that do not exist yet; they are created on import. */
  newCategories: string[];
  errors: Array<{ row: number; message: string }>;
  /** True only when the data was actually written. */
  committed: boolean;
}

const MAX_IMPORT_ROWS = 2000;
const MAX_REPORTED_ERRORS = 50;

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  item: "name",
  itemname: "name",
  category: "category",
  price: "price",
  sgst: "sgst",
  cgst: "cgst",
  currency: "currency",
  status: "status",
  sku: "sku",
  barcode: "sku",
  type: "type",
  veg: "type",
  description: "description",
};

function parseStatus(value: string): "active" | "disabled" | null {
  const v = value.toLowerCase();
  if (v === "" || ["active", "enabled", "enable", "yes", "1", "true"].includes(v)) return "active";
  if (["disabled", "disable", "inactive", "no", "0", "false"].includes(v)) return "disabled";
  return null;
}

function parseType(value: string): boolean | null | undefined {
  const v = value.toLowerCase().replace(/[\s_-]/g, "");
  if (v === "") return null;
  if (["veg", "v", "vegetarian"].includes(v)) return true;
  if (["nonveg", "nv", "nonvegetarian"].includes(v)) return false;
  return undefined;
}

export async function importMenuCsv(
  csv: string,
  options: { dryRun: boolean; userId: string },
): Promise<ImportResult> {
  let table: string[][];
  try {
    table = parseCsv(csv);
  } catch (error) {
    throw HttpError.badRequest(error instanceof Error ? error.message : "Could not read the file.");
  }
  const [headerRow, ...dataRows] = table;
  if (!headerRow) throw HttpError.badRequest("The file has no rows.");
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw HttpError.badRequest(`The file has ${dataRows.length} rows. The limit is ${MAX_IMPORT_ROWS}.`);
  }

  const columnIndex = new Map<string, number>();
  headerRow.forEach((h, i) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (key && !columnIndex.has(key)) columnIndex.set(key, i);
  });
  for (const required of ["name", "category", "price"]) {
    if (!columnIndex.has(required)) throw HttpError.badRequest(`The file needs a "${required}" column.`);
  }

  const settings = await getSettings();
  const categoryRows = await db.select({ id: categories.id, name: categories.name }).from(categories);
  const categoryByName = new Map(categoryRows.map((c) => [c.name.toLowerCase(), c.id]));
  const existing = await db
    .select({ id: menuItems.id, name: menuItems.name, categoryId: menuItems.categoryId, sku: menuItems.sku })
    .from(menuItems)
    .where(isNull(menuItems.deletedAt))
    .limit(50_000);
  const bySku = new Map(existing.filter((e) => e.sku).map((e) => [(e.sku as string).toLowerCase(), e]));
  const byNameCategory = new Map(existing.map((e) => [`${e.categoryId}:${e.name.toLowerCase()}`, e]));

  interface PlannedRow {
    existingId: number | null;
    categoryName: string;
    categoryId: number | null;
    data: Omit<MenuItemData, "categoryId" | "variants" | "addons" | "imageUrl">;
  }
  const planned: PlannedRow[] = [];
  const errors: ImportResult["errors"] = [];
  const seenSkus = new Set<string>();
  const newCategoryNames = new Map<string, string>();

  const cell = (row: string[], key: string): string =>
    unescapeCell((row[columnIndex.get(key) ?? -1] ?? "").trim());

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const fail = (message: string) => errors.push({ row: rowNumber, message });

    const categoryName = cell(row, "category");
    if (!categoryName) return fail("Category is required.");

    const status = parseStatus(cell(row, "status"));
    if (status === null) return fail(`Unknown status "${cell(row, "status")}". Use active or disabled.`);
    const isVeg = parseType(cell(row, "type"));
    if (isVeg === undefined) return fail(`Unknown type "${cell(row, "type")}". Use Veg, Non-veg or leave it empty.`);

    const parsed = menuItemSchema.omit({ categoryId: true, variants: true, addons: true, imageUrl: true }).safeParse({
      name: cell(row, "name"),
      description: cell(row, "description"),
      price: cell(row, "price").replaceAll(",", ""),
      sgst: cell(row, "sgst") || settings.tax.defaultSgst,
      cgst: cell(row, "cgst") || settings.tax.defaultCgst,
      currency: cell(row, "currency") || undefined,
      status,
      sku: cell(row, "sku"),
      isVeg,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(`${String(issue?.path[0] ?? "Row")}: ${issue?.message ?? "Invalid value"}`);
    }
    const data = parsed.data;

    if (data.sku) {
      const key = data.sku.toLowerCase();
      if (seenSkus.has(key)) return fail(`SKU "${data.sku}" appears more than once in the file.`);
      seenSkus.add(key);
    }

    const categoryId = categoryByName.get(categoryName.toLowerCase()) ?? null;
    if (categoryId === null) newCategoryNames.set(categoryName.toLowerCase(), categoryName);

    const match =
      (data.sku ? bySku.get(data.sku.toLowerCase()) : undefined) ??
      (categoryId !== null ? byNameCategory.get(`${categoryId}:${data.name.toLowerCase()}`) : undefined);

    planned.push({ existingId: match?.id ?? null, categoryName, categoryId, data });
  });

  const result: ImportResult = {
    totalRows: dataRows.length,
    created: planned.filter((p) => p.existingId === null).length,
    updated: planned.filter((p) => p.existingId !== null).length,
    newCategories: [...newCategoryNames.values()],
    errors: errors.slice(0, MAX_REPORTED_ERRORS),
    committed: false,
  };
  if (errors.length > 0 || options.dryRun || planned.length === 0) return result;

  try {
    await db.transaction(async (tx) => {
      const idByCategory = new Map(categoryByName);
      if (newCategoryNames.size > 0) {
        const [{ top } = { top: null }] = await tx
          .select({ top: sql<number | null>`max(${categories.sortOrder})` })
          .from(categories);
        let next = (top ?? -1) + 1;
        for (const [key, name] of newCategoryNames) {
          const [created] = await tx
            .insert(categories)
            .values({ name, sortOrder: next++, createdUserId: options.userId })
            .returning({ id: categories.id });
          if (created) idByCategory.set(key, created.id);
        }
      }

      for (const p of planned) {
        const categoryId = p.categoryId ?? idByCategory.get(p.categoryName.toLowerCase());
        if (categoryId === undefined) throw new Error(`Category ${p.categoryName} could not be resolved`);
        const common = {
          name: p.data.name,
          description: p.data.description,
          categoryId,
          price: parseMoney(p.data.price),
          sgst: p.data.sgst,
          cgst: p.data.cgst,
          currency: p.data.currency ?? settings.locale.currency,
          status: p.data.status,
          sku: p.data.sku,
          isVeg: p.data.isVeg,
        };
        if (p.existingId === null) {
          await tx.insert(menuItems).values({ ...common, createdUserId: options.userId });
        } else {
          await tx.update(menuItems).set(common).where(eq(menuItems.id, p.existingId));
        }
      }

      await AuditService.record(
        {
          userId: options.userId,
          action: "menu.import",
          entity: "menu_item",
          metadata: { created: result.created, updated: result.updated, newCategories: result.newCategories },
        },
        tx,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw HttpError.conflict("A SKU in the file is already used by an item that was not matched. Fix the SKU and try again.");
    }
    throw error;
  }
  return { ...result, committed: true };
}
