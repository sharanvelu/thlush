import { z } from "zod";
import { moneyString } from "@/lib/validation/common";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined);

export const BILL_SORTS = ["date_desc", "date_asc", "total_desc", "total_asc", "customer_asc", "customer_desc"] as const;
export type BillSort = (typeof BILL_SORTS)[number];

export const BILL_STATUSES = ["completed", "void", "refunded", "held"] as const;

/** Filters shared by the list, the CSV export and the XLSX export. Bad values fall back to "no filter". */
export const billFilterSchema = z.object({
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  customer: text(100),
  item: text(100),
  min: moneyString().optional().catch(undefined),
  max: moneyString().optional().catch(undefined),
  method: z.enum(["cash", "card", "upi", "other"]).optional().catch(undefined),
  /** Left out, held bills are hidden; pick "held" to see them. */
  status: z.enum(BILL_STATUSES).optional().catch(undefined),
  cashier: z.string().uuid().optional().catch(undefined),
  sort: z.enum(BILL_SORTS).catch("date_desc").default("date_desc"),
});
export type BillFilters = z.output<typeof billFilterSchema>;

export const billListQuerySchema = billFilterSchema.extend({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20).default(20),
});
export type BillListQuery = z.output<typeof billListQuerySchema>;

export const billExportQuerySchema = billFilterSchema.extend({
  format: z.enum(["csv", "xlsx"]).catch("csv").default("csv"),
});

export const billReverseSchema = z.object({
  type: z.enum(["void", "refund"]),
  reason: z.string().trim().min(3, "Give a reason (at least 3 characters)").max(200, "Keep the reason under 200 characters"),
});
export type BillReverseInput = z.output<typeof billReverseSchema>;

/** Number of filters in use, for the badge on the filter panel. */
export function activeFilterCount(f: BillFilters): number {
  return [f.from || f.to, f.customer, f.item, f.min || f.max, f.method, f.status, f.cashier].filter(Boolean).length;
}
