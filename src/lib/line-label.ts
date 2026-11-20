/**
 * How a bill line's name is written. A line is saved with a combined label, "Cold Coffee (Large + Extra shot x3)",
 * which stays as it is in the database (old bills keep theirs). Slips and receipts show it differently: the
 * variant in brackets after the name, and each add-on on its own indented line. These helpers rebuild that
 * from the saved options, so old and new bills print the same way.
 */
import type { BillItemOptions } from "@/db/schema";

/** The part of the saved label after the item's own name: ` (Large + Extra shot x3, Mayo)`. Empty with no options. */
export function optionsSuffix(options: BillItemOptions | null | undefined): string {
  const parts: string[] = [];
  if (options?.variant) parts.push(options.variant);
  const addons = options?.addons ?? [];
  if (addons.length > 0) {
    parts.push(`+ ${addons.map((a) => ((a.quantity ?? 1) > 1 ? `${a.name} x${a.quantity}` : a.name)).join(", ")}`);
  }
  return parts.length > 0 ? ` (${parts.join(" ")})` : "";
}

/**
 * The line's name for printing: the item's name, then its variant in brackets. Add-ons are left out, because
 * they are printed on lines of their own. A name that does not end the way the label should (it was edited,
 * or saved by an older version) is kept as it is, with the variant added in brackets unless it already shows.
 */
export function lineTitle(name: string, options: BillItemOptions | null | undefined): string {
  const variant = options?.variant;
  const suffix = optionsSuffix(options);
  if (suffix && name.endsWith(suffix)) {
    const base = name.slice(0, name.length - suffix.length);
    return variant ? `${base} (${variant})` : base;
  }
  return variant && !name.includes(`(${variant}`) ? `${name} (${variant})` : name;
}
