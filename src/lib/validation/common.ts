import { z } from "zod";

/** A non-negative amount with up to 2 decimals, kept as a string (never a float). */
export const moneyString = (label = "Amount") =>
  z
    .string()
    .trim()
    .regex(/^\d{1,9}(\.\d{1,2})?$/, `${label} must be a number like 120 or 120.50`);

/** A signed amount (for variant price differences). */
export const signedMoneyString = (label = "Amount") =>
  z
    .string()
    .trim()
    .regex(/^-?\d{1,9}(\.\d{1,2})?$/, `${label} must be a number like 20 or -10.50`);

/** A tax percentage from 0 to 50 with up to 2 decimals. */
export const percentString = (label = "Rate") =>
  z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d{1,2})?$/, `${label} must be a percentage like 2.5`)
    .refine((v) => Number(v) <= 50, `${label} cannot be more than 50%`);

/** Empty strings and undefined become null, so optional text fields store NULL. */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .nullish()
    .transform((v) => (v ? v : null));

/** Positive integer id, accepting numeric strings from route params. */
export const idSchema = z.coerce.number().int().positive();

export const statusSchema = z.enum(["active", "disabled"]);
export type EntityStatus = z.infer<typeof statusSchema>;
