import { z } from "zod";
import {
  idSchema,
  moneyString,
  optionalText,
  percentString,
  quantityField,
  signedMoneyString,
  statusSchema,
  unitSchema,
} from "@/lib/validation/common";

/** Product photos are stored as small WebP/PNG/JPEG data URLs, or an https link. */
export const MAX_IMAGE_CHARS = 300_000;

const imageUrlSchema = z
  .string()
  .max(MAX_IMAGE_CHARS, "Image is too large")
  .refine(
    (v) => /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) || /^https:\/\/\S+$/.test(v),
    "Image must be a PNG, JPEG or WebP file, or an https link",
  );

export const variantSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required").max(40),
  priceDelta: signedMoneyString("Price difference"),
});

export const addonSchema = z.object({
  name: z.string().trim().min(1, "Add-on name is required").max(40),
  price: moneyString("Add-on price"),
});

/**
 * The fields of a menu item, with no defaults. Creating adds defaults on top; updating makes every
 * field optional. Keeping defaults out of this shape matters: a default inside an update schema
 * would be "filled in" for fields the caller never sent and silently overwrite real data.
 */
const menuItemShape = {
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  description: optionalText(500, "Description"),
  categoryId: z.number("Choose a category").int().positive("Choose a category"),
  price: moneyString("Price"),
  sgst: percentString("SGST"),
  cgst: percentString("CGST"),
  /** ISO 4217 code. Falls back to the business currency when omitted. */
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code like INR")
    .optional(),
  status: statusSchema,
  sku: optionalText(64, "SKU"),
  imageUrl: imageUrlSchema.nullish().transform((v) => v ?? null),
  /** true = veg, false = non-veg, null = not applicable. */
  isVeg: z.boolean().nullish().transform((v) => v ?? null),
  variants: z.array(variantSchema).max(10, "At most 10 variants"),
  addons: z.array(addonSchema).max(20, "At most 20 add-ons"),
  /** Stock is only counted for items that track it. */
  trackStock: z.boolean(),
  unit: unitSchema,
  reorderLevel: quantityField("Reorder level"),
  costPrice: moneyString("Cost price"),
};

export const menuItemSchema = z.object({
  ...menuItemShape,
  status: menuItemShape.status.default("active"),
  variants: menuItemShape.variants.default([]),
  addons: menuItemShape.addons.default([]),
  trackStock: menuItemShape.trackStock.default(false),
  unit: menuItemShape.unit.default("pcs"),
  reorderLevel: menuItemShape.reorderLevel.default("0"),
  costPrice: menuItemShape.costPrice.default("0"),
  /** Stock on hand when the item is created. Later changes go through stock adjustments. */
  openingStock: z
    .union([z.literal(""), quantityField("Opening stock")])
    .optional()
    .transform((v) => v || undefined),
});

export type MenuItemInput = z.input<typeof menuItemSchema>;
export type MenuItemData = z.output<typeof menuItemSchema>;

/** Stock quantities are never edited here, only through adjustments, purchases and sales. */
export const menuItemPatchSchema = z.object(menuItemShape).partial();
export type MenuItemPatch = z.output<typeof menuItemPatchSchema>;

export const MENU_SORT_FIELDS = ["name", "category", "price", "status", "created"] as const;
export type MenuSortField = (typeof MENU_SORT_FIELDS)[number];

export const GROUPED_PAGE_SIZE = 100;
export const FLAT_PAGE_SIZE = 20;

export const menuListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    category: idSchema.optional().catch(undefined),
    status: z.enum(["active", "disabled", "all"]).catch("all").default("all"),
    sort: z.enum(MENU_SORT_FIELDS).catch("name").default("name"),
    dir: z.enum(["asc", "desc"]).catch("asc").default("asc"),
    page: z.coerce.number().int().min(1).catch(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
    view: z.enum(["table", "grid"]).catch("table").default("table"),
    /** "category" lists items under their category, in POS tab order. */
    group: z.enum(["category", "none"]).catch("category").default("category"),
  })
  // Grouped lists show every category on one page unless the viewer picks a size.
  .transform((q) => ({
    ...q,
    pageSize: q.pageSize ?? (q.group === "category" ? GROUPED_PAGE_SIZE : FLAT_PAGE_SIZE),
  }));
export type MenuListQuery = z.output<typeof menuListQuerySchema>;

export const menuBulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enable"), ids: z.array(idSchema).min(1).max(500) }),
  z.object({ action: z.literal("disable"), ids: z.array(idSchema).min(1).max(500) }),
  z.object({ action: z.literal("delete"), ids: z.array(idSchema).min(1).max(500) }),
  z.object({
    action: z.literal("move"),
    ids: z.array(idSchema).min(1).max(500),
    categoryId: idSchema,
  }),
]);
export type MenuBulkInput = z.output<typeof menuBulkSchema>;

export const menuImportSchema = z.object({
  csv: z.string().min(1, "The file is empty").max(2_000_000, "The file is too large (2 MB maximum)"),
  dryRun: z.boolean().default(true),
});
