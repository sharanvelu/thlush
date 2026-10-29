import { buildPagination, paginated, withAuth } from "@/lib/api";
import * as BillingService from "@/services/BillingService";

/** Bills parked on the billing screen. Cashiers see their own; managers and admins see everyone's. */
export const GET = withAuth(
  async (_req, { user }) => {
    const rows = await BillingService.listHeldBills(user);
    return paginated(rows, buildPagination(1, Math.max(rows.length, 1), rows.length));
  },
  { permission: "bills.create" },
);
