import { parseId, withAuth } from "@/lib/api";
import { buildReceiptModel } from "@/lib/receipt";
import * as BillingService from "@/services/BillingService";
import { renderReceiptPdf } from "@/services/ReceiptPdf";
import { getSettings } from "@/services/SettingsService";

/** The receipt as a narrow PDF, sized for the configured paper width. */
export const GET = withAuth<{ id: string }>(
  async (_req, { user, params }) => {
    const [bill, settings] = await Promise.all([BillingService.getBill(parseId(params.id), user), getSettings()]);
    const pdf = await renderReceiptPdf(buildReceiptModel(bill, settings));
    const filename = `receipt-${bill.billNo}.pdf`.replace(/[^\w.-]/g, "_");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
  { anyOf: ["bills.view_own", "bills.view_all"] },
);
