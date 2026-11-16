/**
 * Which part of a bill's lines the kitchen has already been sent, with no database access.
 *
 * A held bill is rewritten on every save, so what was sent has to be carried over by matching
 * lines: the same item with the same variant and add-ons. Matching on content (not row ids)
 * means the cart can merge or reorder lines freely.
 */
import { HttpError } from "@/lib/errors";
import { D, parseQuantity, type Dec } from "@/lib/money";
import type { BillItemOptions } from "@/db/schema";

export function sentKey(menuItemId: number | null, options: BillItemOptions | null): string {
  const addons = (options?.addons ?? []).map((a) => a.name).sort().join(",");
  return `${menuItemId ?? 0}|${options?.variant ?? ""}|${addons}`;
}

export interface PreviousLine {
  menuItemId: number | null;
  name: string;
  options: BillItemOptions | null;
  sentQty: string;
}

export interface NewLine {
  menuItemId: number;
  options: BillItemOptions | null;
  quantity: string;
}

export interface SentAllocation {
  /** Sent quantity for each new line, in the same order. */
  sentQty: string[];
  /** The part of each line that has not been sent before. Only lines with something new. */
  fresh: Array<{ index: number; quantity: string }>;
}

/**
 * `keep`: carry the earlier sent amounts over unchanged (hold, or finishing without a kitchen slip).
 * `send`: everything on the bill counts as sent now; `fresh` is what was not sent before.
 *
 * Items already sent cannot be removed or reduced: the kitchen has started on them.
 */
export function allocateSent(previous: PreviousLine[], lines: NewLine[], mode: "keep" | "send"): SentAllocation {
  const pool = new Map<string, { qty: Dec; name: string }>();
  for (const row of previous) {
    const sent = new D(row.sentQty);
    if (sent.lessThanOrEqualTo(0)) continue;
    const key = sentKey(row.menuItemId, row.options);
    const entry = pool.get(key);
    pool.set(key, { qty: (entry?.qty ?? new D(0)).plus(sent), name: entry?.name ?? row.name });
  }

  const sentQty: string[] = [];
  const fresh: SentAllocation["fresh"] = [];
  lines.forEach((line, index) => {
    const key = sentKey(line.menuItemId, line.options);
    const quantity = new D(line.quantity);
    const entry = pool.get(key);
    const already = entry ? D.min(quantity, entry.qty) : new D(0);
    if (entry) pool.set(key, { ...entry, qty: entry.qty.minus(already) });

    const sent = mode === "send" ? quantity : already;
    sentQty.push(parseQuantity(sent));
    const added = quantity.minus(already);
    if (mode === "send" && added.greaterThan(0)) fresh.push({ index, quantity: parseQuantity(added) });
  });

  for (const { qty, name } of pool.values()) {
    if (qty.greaterThan(0)) {
      throw HttpError.conflict(`"${name}" was already sent to the kitchen, so it cannot be removed or reduced.`);
    }
  }
  return { sentQty, fresh };
}
