import { z } from "zod";
import { optionalText, statusSchema } from "@/lib/validation/common";

/** Fields with no defaults, so an update only ever touches what it sends (see the menu schema). */
const staffShape = {
  name: z.string().trim().min(1, "Name is required").max(60, "Name must be 60 characters or fewer"),
  title: optionalText(40, "Title"),
  isCashier: z.boolean(),
  status: statusSchema,
};

export const staffSchema = z.object({
  ...staffShape,
  isCashier: staffShape.isCashier.default(true),
  status: staffShape.status.default("active"),
});
export type StaffInput = z.input<typeof staffSchema>;
export type StaffData = z.output<typeof staffSchema>;

export const staffPatchSchema = z.object(staffShape).partial();
export type StaffPatch = z.output<typeof staffPatchSchema>;
