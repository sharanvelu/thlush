import { z } from "zod";
import { buildPagination, paginated, parseQuery, withAuth } from "@/lib/api";
import * as CustomerService from "@/services/CustomerService";

const querySchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(8).default(8),
});

/** Customer lookup by name or phone, used by the billing screen's autocomplete. */
export const GET = withAuth(
  async (req) => {
    const { q, page, pageSize } = parseQuery(req, querySchema);
    const { rows, total } = await CustomerService.searchCustomers(q, { page, pageSize });
    return paginated(rows, buildPagination(page, pageSize, total));
  },
  { permission: "customers.view" },
);
