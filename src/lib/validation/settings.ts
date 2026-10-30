import { z } from "zod";
import { isHexColor } from "@/lib/color";
import { percentString } from "@/lib/validation/common";
import type { SettingsKey } from "@/types/settings";

const text = (max: number, label: string) => z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

const validIn = (check: () => unknown) => {
  try {
    check();
    return true;
  } catch {
    return false;
  }
};

export const MAX_LOGO_CHARS = 150_000;

export const settingsSchemas = {
  business: z.object({
    name: text(80, "Name").min(1, "Business name is required"),
    logoUrl: z
      .string()
      .max(MAX_LOGO_CHARS, "The logo is too large")
      .refine((v) => /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) || /^https:\/\/\S+$/.test(v), "Logo must be a PNG, JPEG or WebP image")
      .nullable(),
    address: text(300, "Address"),
    phone: text(30, "Phone"),
    email: text(120, "Email").refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address"),
    gstin: text(20, "GSTIN").transform((v) => v.toUpperCase()).refine((v) => v === "" || /^[0-9A-Z]{5,20}$/.test(v), "Letters and numbers only, no spaces"),
  }),
  locale: z.object({
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter code like INR").refine((v) => validIn(() => new Intl.NumberFormat("en", { style: "currency", currency: v })), "That isn't a known currency"),
    locale: z.string().trim().min(2).max(20).refine((v) => validIn(() => Intl.getCanonicalLocales(v)), "Use a locale like en-IN"),
    timezone: z.string().trim().min(1, "Choose a timezone").refine((v) => validIn(() => new Intl.DateTimeFormat("en", { timeZone: v })), "That isn't a known timezone"),
  }),
  tax: z.object({ ignoreTax: z.boolean(), defaultSgst: percentString("SGST"), defaultCgst: percentString("CGST") }),
  receipt: z.object({
    header: text(200, "Header"),
    footer: text(200, "Footer"),
    paperSize: z.enum(["58mm", "80mm"]),
  }),
  billing: z.object({
    billPrefix: z.string().trim().regex(/^[A-Za-z0-9_-]{0,10}$/, "Up to 10 letters, numbers, dashes or underscores"),
    sequencePadding: z.number().int().min(1, "At least 1").max(8, "At most 8"),
    defaultCustomerName: text(60, "Name"),
    blockOutOfStock: z.boolean(),
  }),
  appearance: z.object({ accent: z.string().refine(isHexColor, "Use a colour like #cc3300").nullable() }),
  features: z.object({ inventory: z.boolean(), discounts: z.boolean(), orderTypes: z.boolean() }),
} satisfies Record<SettingsKey, z.ZodType>;

export const SETTINGS_GROUPS = Object.keys(settingsSchemas) as SettingsKey[];

export const settingsUpdateSchema = z.object({
  group: z.enum(SETTINGS_GROUPS as [SettingsKey, ...SettingsKey[]]),
  values: z.record(z.string(), z.unknown()),
});
