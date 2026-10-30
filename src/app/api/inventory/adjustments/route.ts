import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { movementQuerySchema, stockAdjustSchema } from "@/lib/validation/inventory";
import { getSettingsGroup } from "@/services/SettingsService";
import { adjustStock, listMovements } from "@/services/StockService";

/** The stock ledger: every change to stock, newest first. */
export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, movementQuerySchema);
    const { timezone } = await getSettingsGroup("locale");
    const { rows, total } = await listMovements(query, timezone);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "inventory.view" },
);

export const POST = withAuth(
  async (req, { user }) => ok(await adjustStock(await parseBody(req, stockAdjustSchema), user), { status: 201 }),
  { permission: "inventory.adjust" },
);
