import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { purchaseListQuerySchema, purchaseSchema } from "@/lib/validation/inventory";
import { createPurchase, listPurchases } from "@/services/PurchasingService";
import { getSettingsGroup } from "@/services/SettingsService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, purchaseListQuerySchema);
    const { rows, total } = await listPurchases(query);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "suppliers.manage" },
);

/** Receives stock: records the purchase, adds to stock and updates cost prices in one transaction. */
export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, purchaseSchema);
    const { timezone } = await getSettingsGroup("locale");
    return ok(await createPurchase(input, user, timezone), { status: 201 });
  },
  { permission: "suppliers.manage" },
);
