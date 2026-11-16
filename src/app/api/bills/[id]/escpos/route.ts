import { parseId, withAuth } from "@/lib/api";
import { buildPrintJob } from "@/lib/escpos-receipt";
import * as BillingService from "@/services/BillingService";
import { getSettings } from "@/services/SettingsService";

/**
 * The receipt as raw ESC/POS bytes, plus a kitchen slip: `?kitchen=1` for the whole bill, `?kot=N` for one send of a
 * running order. `?receipt=0` leaves the receipt out. The browser
 * hands them to the local print agent, which sends them straight to the thermal printer.
 */
export const GET = withAuth<{ id: string }>(
  async (req, { user, params }) => {
    const query = req.nextUrl.searchParams;
    const kitchen = query.get("kitchen") === "1";
    const kotParam = Number(query.get("kot"));
    const kot = Number.isInteger(kotParam) && kotParam > 0 ? kotParam : undefined;
    const receipt = query.get("receipt") !== "0";
    const [bill, settings] = await Promise.all([BillingService.getBill(parseId(params.id), user), getSettings()]);
    return new Response(new Uint8Array(buildPrintJob(bill, settings, { kitchen, kot, receipt })), {
      headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store" },
    });
  },
  { anyOf: ["bills.view_own", "bills.view_all"] },
);
