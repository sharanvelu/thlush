import { ok, parseBody, parseId, withAuth } from "@/lib/api";
import { billReverseSchema } from "@/lib/validation/bill-history";
import * as BillHistoryService from "@/services/BillHistoryService";

/** Voids or refunds a completed bill (reason required) and restocks tracked items. */
export const POST = withAuth<{ id: string }>(
  async (req, { user, params }) => {
    const input = await parseBody(req, billReverseSchema);
    return ok(await BillHistoryService.reverseBill(parseId(params.id), input, user));
  },
  { permission: "bills.void" },
);
