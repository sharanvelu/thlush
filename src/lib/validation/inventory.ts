import { z } from "zod";
import { MANUAL_REASONS, reasonAllowsDirection } from "@/lib/inventory";
import { idSchema, moneyString, optionalText, quantityField, statusSchema } from "@/lib/validation/common";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));

// ---- Stock overview -------------------------------------------------------
export const STOCK_SORTS = ["name_asc", "stock_asc", "stock_desc", "value_desc", "category_asc"] as const;
export const stockListQuerySchema = z.object({
  q: z.string().trim().max(100).transform((v) => v || undefined).optional().catch(undefined),
  category: idSchema.optional().catch(undefined),
  status: z.enum(["in", "low", "out"]).optional().catch(undefined),
  sort: z.enum(STOCK_SORTS).catch("name_asc").default("name_asc"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
});
export type StockListQuery = z.output<typeof stockListQuerySchema>;

// ---- Adjustments ----------------------------------------------------------
export const stockAdjustSchema = z
  .object({
    menuItemId: idSchema,
    direction: z.enum(["add", "remove"]),
    quantity: quantityField("Quantity").refine((v) => Number(v) > 0, "Quantity must be more than zero"),
    reason: z.enum(MANUAL_REASONS),
    note: optionalText(200, "Note"),
  })
  .refine((v) => reasonAllowsDirection(v.reason, v.direction), {
    path: ["direction"],
    message: "That reason doesn't fit: purchases add stock, wastage and damage remove it.",
  });
export type StockAdjustInput = z.output<typeof stockAdjustSchema>;

export const movementQuerySchema = z.object({
  item: idSchema.optional().catch(undefined),
  reason: z.enum(["purchase", "wastage", "damage", "correction", "return", "sale", "void", "refund"]).optional().catch(undefined),
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
});
export type MovementQuery = z.output<typeof movementQuerySchema>;

// ---- Suppliers and purchases ---------------------------------------------
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  contactName: optionalText(100, "Contact"),
  phone: optionalText(30, "Phone"),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
    .nullish()
    .transform((v) => (v ? v.toLowerCase() : null)),
  address: optionalText(300, "Address"),
  notes: optionalText(500, "Notes"),
  status: statusSchema.default("active"),
});
export type SupplierData = z.output<typeof supplierSchema>;
export const supplierPatchSchema = z.object(supplierSchema.shape).partial().extend({ status: statusSchema.optional() });

export const supplierListQuerySchema = z.object({
  q: z.string().trim().max(100).transform((v) => v || undefined).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
});

export const purchaseSchema = z
  .object({
    supplierId: idSchema.nullish().transform((v) => v ?? null),
    invoiceNo: optionalText(60, "Invoice number"),
    /** The day stock was received. Left out, it is now. */
    date: day.nullish().transform((v) => v ?? null),
    notes: optionalText(300, "Notes"),
    items: z
      .array(
        z.object({
          menuItemId: idSchema,
          quantity: quantityField("Quantity").refine((v) => Number(v) > 0, "Quantity must be more than zero"),
          costPrice: moneyString("Cost price"),
        }),
      )
      .min(1, "Add at least one item")
      .max(100, "At most 100 items on one purchase"),
  })
  .refine((v) => new Set(v.items.map((i) => i.menuItemId)).size === v.items.length, {
    path: ["items"],
    message: "Each item can only appear once. Add the quantities together.",
  });
export type PurchaseInput = z.output<typeof purchaseSchema>;

export const purchaseListQuerySchema = z.object({
  supplier: idSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20).default(20),
});
