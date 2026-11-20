/**
 * Add-ons on a bill line can be taken more than once ("Extra cheese x3"). These helpers are shared by the
 * billing screen, the server's pricing and the printed slips, and have no React or database in them.
 */

/** An add-on picked for a line, and how many of it. */
export interface AddonChoice {
  name: string;
  quantity: number;
}

/** Most of one add-on on a single line. */
export const MAX_ADDON_QUANTITY = 20;

/** "+ Extra cheese", or "+ Extra cheese x3" when more than one. */
export function addonLabel(addon: { name: string; quantity?: number }): string {
  return (addon.quantity ?? 1) > 1 ? `+ ${addon.name} x${addon.quantity}` : `+ ${addon.name}`;
}

/** Order-independent text for matching lines: `Extra cheese*3,Mayo*1`. */
export function addonsKey(addons: ReadonlyArray<{ name: string; quantity?: number }>): string {
  return addons
    .map((a) => `${a.name}*${a.quantity ?? 1}`)
    .sort()
    .join(",");
}

/**
 * Reads add-ons from stored or sent data. Older data lists add-ons as plain names, one each, so names are
 * accepted too. Anything unusable is dropped.
 */
export function normalizeAddons(raw: unknown): AddonChoice[] {
  if (!Array.isArray(raw)) return [];
  const result: AddonChoice[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") result.push({ name: entry, quantity: 1 });
    else if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
      const { name, quantity } = entry as { name: string; quantity?: unknown };
      const q = typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1 ? quantity : 1;
      result.push({ name, quantity: Math.min(q, MAX_ADDON_QUANTITY) });
    }
  }
  return result;
}
