import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { billSaveSchema } from "@/lib/validation/bill";
import { billListQuerySchema } from "@/lib/validation/bill-history";
import * as BillHistoryService from "@/services/BillHistoryService";
import * as BillingService from "@/services/BillingService";
import { getSettingsGroup } from "@/services/SettingsService";

/** Bill history: filtered, sorted and paged. Cashiers only ever get their own bills. */
export const GET = withAuth(
  async (req, { user }) => {
    const { page, pageSize, ...filters } = parseQuery(req, billListQuerySchema);
    const { timezone } = await getSettingsGroup("locale");
    const { rows, total, revenue } = await BillHistoryService.listBills(filters, { page, pageSize }, user, timezone);
    const response = paginated(rows, buildPagination(page, pageSize, total));
    response.headers.set("X-Revenue", revenue);
    return response;
  },
  { anyOf: ["bills.view_own", "bills.view_all"] },
);

/** Saves a bill (action "complete") or parks it (action "hold"). Safe to retry with the same clientRef. */
export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, billSaveSchema);
    return ok(await BillingService.saveBill(input, user), { status: 201 });
  },
  { permission: "bills.create" },
);
