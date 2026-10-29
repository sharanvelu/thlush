import { ok, parseBody, withAuth } from "@/lib/api";
import { billSaveSchema } from "@/lib/validation/bill";
import * as BillingService from "@/services/BillingService";

/** Saves a bill (action "complete") or parks it (action "hold"). Safe to retry with the same clientRef. */
export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, billSaveSchema);
    return ok(await BillingService.saveBill(input, user), { status: 201 });
  },
  { permission: "bills.create" },
);
