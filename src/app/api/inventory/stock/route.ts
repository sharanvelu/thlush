import { buildPagination, paginated, parseQuery, withAuth } from "@/lib/api";
import { stockListQuerySchema } from "@/lib/validation/inventory";
import { listStock } from "@/services/StockService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, stockListQuerySchema);
    const { rows, total, summary } = await listStock(query);
    const response = paginated(rows, buildPagination(query.page, query.pageSize, total));
    response.headers.set("X-Stock-Summary", JSON.stringify(summary));
    return response;
  },
  { permission: "inventory.view" },
);
