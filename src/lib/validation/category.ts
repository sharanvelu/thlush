import { z } from "zod";
import { CATEGORY_ICONS } from "@/config/category-icons";
import { optionalText, statusSchema } from "@/lib/validation/common";

/** Fields with no defaults, so an update only ever touches what it sends (see the menu schema). */
const categoryShape = {
  name: z.string().trim().min(1, "Name is required").max(60, "Name must be 60 characters or fewer"),
  description: optionalText(200, "Description"),
  status: statusSchema,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour")
    .nullish()
    .transform((v) => v ?? null),
  icon: z
    .enum(CATEGORY_ICONS)
    .nullish()
    .transform((v) => v ?? null),
};

export const categorySchema = z.object({ ...categoryShape, status: categoryShape.status.default("active") });

export type CategoryInput = z.input<typeof categorySchema>;
export type CategoryData = z.output<typeof categorySchema>;

export const categoryPatchSchema = z.object(categoryShape).partial();
export type CategoryPatch = z.output<typeof categoryPatchSchema>;

export const categoryReorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});

export const categoryListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["active", "disabled", "all"]).default("all"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(100).default(100),
});
export type CategoryListQuery = z.output<typeof categoryListQuerySchema>;
