import { ok, parseId, withAuth } from "@/lib/api";
import * as BillingService from "@/services/BillingService";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { user, params }) => ok(await BillingService.getBill(parseId(params.id), user)),
  { anyOf: ["bills.view_own", "bills.view_all"] },
);

/** Discards a bill that is on hold. Completed bills are voided instead (Bill History). */
export const DELETE = withAuth<Params>(
  async (_req, { user, params }) => {
    await BillingService.discardHeldBill(parseId(params.id), user);
    return ok({ deleted: true });
  },
  { permission: "bills.create" },
);
