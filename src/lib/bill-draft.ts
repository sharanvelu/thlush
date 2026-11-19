/**
 * The unsaved bill on the New bill screen, kept in the browser so it survives navigating to another page and
 * back. One draft per browser, cleared on every sign-in and sign-out. Browser only.
 */
import type { CartLine } from "@/components/pos/pos-cart";
import type { BillDetailsDraft } from "@/components/pos/pos-types";

const KEY = "thlush:bill-draft";

/** Lines are stored by item id and rebuilt from the current menu, so prices and stock are never stale. */
export interface DraftLine {
  itemId: number;
  variant: string | null;
  addons: string[];
  quantity: string;
  discount: string;
  sentQty: string;
}

export interface BillDraft {
  lines: DraftLine[];
  details: BillDetailsDraft;
  heldBillId: number | null;
}

export function toDraftLines(lines: CartLine[]): DraftLine[] {
  return lines.map((l) => ({
    itemId: l.item.id,
    variant: l.variant,
    addons: l.addons,
    quantity: l.quantity,
    discount: l.discount,
    sentQty: l.sentQty,
  }));
}

export function loadBillDraft(): BillDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as BillDraft;
    if (!Array.isArray(draft.lines)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveBillDraft(draft: BillDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the bill still works, it just won't survive navigation.
  }
}

export function clearBillDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
