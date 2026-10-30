import { z } from "zod";
import { optionalText } from "@/lib/validation/common";

const tagList = z
  .array(z.string().trim().min(1).max(30, "Tags must be 30 characters or fewer"))
  .max(10, "At most 10 tags")
  .transform((list) => {
    // One tag per word, whatever the case it was typed in.
    const seen = new Set<string>();
    return list.filter((t) => (seen.has(t.toLowerCase()) ? false : seen.add(t.toLowerCase()) && true));
  });

const customerShape = {
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone must be 20 characters or fewer")
    .refine((v) => v === "" || /^\+?[\d\s\-()]{5,20}$/.test(v), "Enter a phone number like 98450 10001")
    .nullish()
    .transform((v) => v || null),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address")
    .nullish()
    .transform((v) => (v ? v.toLowerCase() : null)),
  notes: optionalText(500, "Notes"),
  tags: tagList,
};

/** Create: tags default to none. Update: only the fields sent are changed. */
export const customerSchema = z.object({ ...customerShape, tags: customerShape.tags.default([]) });
export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerData = z.output<typeof customerSchema>;
export const customerPatchSchema = z.object(customerShape).partial();

/** "regular, office" typed into one box becomes ["regular", "office"]. */
export function parseTags(input: string): string[] {
  return input.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
}

export const CUSTOMER_SORTS = [
  "name_asc", "name_desc", "orders_desc", "orders_asc", "spend_desc", "spend_asc", "visit_desc", "visit_asc", "created_desc",
] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export const customerListQuerySchema = z.object({
  q: z.string().trim().max(100).transform((v) => v || undefined).optional().catch(undefined),
  sort: z.enum(CUSTOMER_SORTS).catch("name_asc").default("name_asc"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20).default(20),
});
export type CustomerListQuery = z.output<typeof customerListQuerySchema>;
