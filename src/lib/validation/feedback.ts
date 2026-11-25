import { z } from "zod";

const rating = z.number().int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars.");
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .transform((v) => (v === "" ? undefined : v))
    .optional();

/** What the customer's form sends. The server checks the item ids belong to the bill. */
export const feedbackSubmitSchema = z.object({
  overall: rating,
  ambience: rating,
  service: rating,
  experience: rating,
  wouldRecommend: z.boolean().optional(),
  comment: text(1000),
  items: z
    .array(
      z.object({
        billItemId: z.number().int().positive(),
        // A line can be left unrated.
        rating: rating.optional(),
        comment: text(300),
      }),
    )
    .max(100)
    .default([]),
  contactName: text(80),
  contactPhone: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{6,17}$/, "Enter a valid phone number.")
      .optional(),
  ),
});
export type FeedbackSubmit = z.infer<typeof feedbackSubmitSchema>;

export const feedbackListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  range: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().trim().max(60).optional(),
});
export type FeedbackListQuery = z.output<typeof feedbackListQuerySchema>;
