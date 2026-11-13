import { revalidateTag } from "next/cache";

/** Cache tag for the billing screen's menu. Every menu or category write expires it. */
export const POS_CATALOG_TAG = "pos-catalog";

/** Drops the cached menu. The next time the billing page opens it is read from the database again. */
export function invalidatePosCatalog(): void {
  try {
    revalidateTag(POS_CATALOG_TAG, { expire: 0 });
  } catch {
    // Outside a Next.js request (unit tests, scripts) there is no cache to expire.
  }
}
