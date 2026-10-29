import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/receipt/auto-print";
import { ReceiptActions } from "@/components/receipt/receipt-actions";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { HttpError } from "@/lib/errors";
import { buildReceiptModel, mailtoUrl, whatsappUrl } from "@/lib/receipt";
import { requireUser } from "@/services/AuthService";
import * as BillingService from "@/services/BillingService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };

export default async function ReceiptPage({ params, searchParams }: PageProps<"/receipt/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const billId = Number(id);
  if (!Number.isSafeInteger(billId) || billId <= 0) notFound();

  const [bill, settings] = await Promise.all([
    BillingService.getBill(billId, user).catch((error: unknown) => {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }),
    getSettings(),
  ]);
  if (!bill) notFound();

  const model = buildReceiptModel(bill, settings);
  const autoPrint = query.print === "1";

  return (
    <div className="min-h-dvh bg-neutral-200 py-6 print:bg-white print:py-0">
      {autoPrint ? null : (
        <ReceiptActions
          billId={bill.id}
          whatsappHref={whatsappUrl(model)}
          mailHref={mailtoUrl(model, bill.customer?.email ?? null)}
        />
      )}
      <ReceiptView model={model} />
      {autoPrint ? <AutoPrint /> : null}
    </div>
  );
}
