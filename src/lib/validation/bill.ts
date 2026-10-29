import { z } from "zod";
import { moneyString, optionalText } from "@/lib/validation/common";

/** A quantity with up to 3 decimals (kilograms, litres). Whole pieces are enforced per item by the service. */
export const quantityString = z
  .string()
  .trim()
  .regex(/^\d{1,4}(\.\d{1,3})?$/, "Enter a quantity like 2 or 0.5")
  .refine((v) => Number(v) > 0, "Quantity must be more than zero");

export const billLineSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: quantityString,
  /** Flat amount taken off this line before tax. */
  discount: moneyString("Discount").default("0"),
  variant: z.string().trim().max(40).nullish().transform((v) => v || null),
  addons: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const billPaymentSchema = z.object({
  method: z.enum(["cash", "card", "upi", "other"]),
  /** The amount applied to the bill by this method (never more than the bill total). */
  amount: moneyString("Payment"),
  reference: optionalText(60, "Reference"),
});

export const billCustomerSchema = z
  .union([
    z.object({ id: z.number().int().positive() }),
    z.object({
      name: z.string().trim().min(1, "Enter the customer's name").max(120),
      phone: optionalText(20, "Phone"),
    }),
  ])
  .nullable();

export const billSaveSchema = z.object({
  action: z.enum(["complete", "hold"]),
  /** One id per save attempt, so retries and double-clicks cannot create two bills. */
  clientRef: z.string().trim().min(8).max(64),
  /** Set when this save finishes a bill that was put on hold earlier. */
  heldBillId: z.number().int().positive().nullish().transform((v) => v ?? null),
  customer: billCustomerSchema.default(null),
  lines: z.array(billLineSchema).min(1, "Add at least one item").max(100, "A bill can have at most 100 lines"),
  discount: z
    .object({ type: z.enum(["percent", "flat"]), value: moneyString("Discount") })
    .nullish()
    .transform((v) => v ?? null),
  orderType: z.enum(["dine_in", "takeaway", "delivery"]).nullish().transform((v) => v ?? null),
  tableNo: optionalText(20, "Table number"),
  notes: optionalText(300, "Notes"),
  payments: z.array(billPaymentSchema).max(6).default([]),
  /** Cash handed over, when it is more than the cash applied (the difference is change). */
  cashTendered: moneyString("Cash received").nullish().transform((v) => v ?? null),
});

export type BillSaveInput = z.output<typeof billSaveSchema>;
export type BillSaveRequest = z.input<typeof billSaveSchema>;
export type BillLineInput = BillSaveInput["lines"][number];
