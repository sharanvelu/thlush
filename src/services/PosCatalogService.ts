import { isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import type { PosItem } from "@/components/pos/pos-cart";
import type { PosCategory } from "@/components/pos/product-panel";
import { db, schema } from "@/db";
import { POS_CATALOG_TAG } from "@/lib/catalog-cache";
import { listCategoryOptions } from "@/services/CategoryService";
import { listCatalogForPos } from "@/services/MenuService";

const { menuItems } = schema;

export type CachedPosItem = Omit<PosItem, "stockQty">;

export interface CachedPosCatalog {
  items: CachedPosItem[];
  categories: PosCategory[];
}

/**
 * The menu as the billing screen needs it, minus stock levels. Cached across requests (the
 * `Cache::remember` of this app) until a menu or category edit calls `invalidatePosCatalog()` (lib/catalog-cache).
 * The hour-long expiry is a safety net for changes made outside the app, such as a database edit.
 * Plain JSON only: the cache serialises what it stores.
 */
export const getCachedPosCatalog = unstable_cache(
  async (): Promise<CachedPosCatalog> => {
    const [catalog, options] = await Promise.all([listCatalogForPos(), listCategoryOptions()]);
    return {
      // Disabled categories (and so their items) never reach the billing screen.
      categories: options.filter((c) => c.status === "active"),
      items: catalog.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        sgst: i.sgst,
        cgst: i.cgst,
        categoryId: i.categoryId,
        categoryName: i.categoryName,
        sku: i.sku,
        isVeg: i.isVeg,
        imageSrc: i.imageSrc,
        variants: i.variants,
        addons: i.addons,
        unit: i.unit,
        trackStock: i.trackStock,
        status: i.status,
      })),
    };
  },
  ["pos-catalog-v1"],
  { tags: [POS_CATALOG_TAG], revalidate: 3600 },
);

/**
 * Current stock per item. Deliberately not cached: every sale changes it, so caching it would
 * show wrong quantities or throw the menu cache away on each bill.
 */
export async function getPosStock(): Promise<Map<number, string>> {
  const rows = await db
    .select({ id: menuItems.id, stockQty: menuItems.stockQty })
    .from(menuItems)
    .where(isNull(menuItems.deletedAt));
  return new Map(rows.map((r) => [r.id, r.stockQty]));
}
