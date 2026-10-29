/**
 * Icons a category can use, stored by name. Names are lucide icon identifiers;
 * the component map lives in `components/categories/category-icon.tsx` so server
 * code can validate names without importing any icons.
 */
export const CATEGORY_ICONS = [
  "coffee",
  "cup-soda",
  "beer",
  "wine",
  "utensils",
  "soup",
  "salad",
  "sandwich",
  "pizza",
  "egg-fried",
  "drumstick",
  "fish",
  "cake-slice",
  "ice-cream-cone",
  "cookie",
  "croissant",
  "wheat",
  "package",
  "shopping-basket",
  "tag",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

/** Swatches offered in the category form. */
export const CATEGORY_COLORS = [
  "#f97316",
  "#eab308",
  "#dc2626",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#a16207",
  "#64748b",
] as const;
