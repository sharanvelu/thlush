import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)));
const text = (max: number) => z.string().trim().max(max).transform((v) => v || undefined).optional().catch(undefined);

export const auditQuerySchema = z.object({
  user: z.string().uuid().optional().catch(undefined),
  entity: text(40),
  action: text(60),
  from: day.optional().catch(undefined),
  to: day.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25).default(25),
});
export type AuditQuery = z.output<typeof auditQuerySchema>;
