import { parseId, withAuth } from "@/lib/api";
import { buildPrintJob } from "@/lib/escpos-receipt";
import * as BillingService from "@/services/BillingService";
import { getSettings } from "@/services/SettingsService";

/**
 * The receipt (and, with `?kitchen=1`, the kitchen slip) as raw ESC/POS bytes. The browser
 * hands them to the local print agent, which sends them straight to the thermal printer.
 */
export const GET = withAuth<{ id: string }>(
  async (req, { user, params }) => {
    const kitchen = req.nextUrl.searchParams.get("kitchen") === "1";
    const [bill, settings] = await Promise.all([BillingService.getBill(parseId(params.id), user), getSettings()]);
    return new Response(new Uint8Array(buildPrintJob(bill, settings, { kitchen })), {
      headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store" },
    });
  },
  { anyOf: ["bills.view_own", "bills.view_all"] },
);
