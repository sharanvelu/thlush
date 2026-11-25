"use client";

import { CircleCheck, Copy, Download, ExternalLink, Eye, Loader2, MessageSquareHeart, Plus } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { D, formatMoney } from "@/lib/money";
import type { AppSettings } from "@/types/settings";
import type { BillDetail } from "@/types/bill";

interface SuccessDialogProps {
  bill: BillDetail | null;
  settings: AppSettings;
  onNewBill: () => void;
}

/**
 * Shown after a bill is saved: the bill number, and everything you might do with the receipt. It stays open until
 * the cashier closes it (or starts a new bill), because handing the customer the feedback QR takes as long as it takes.
 */
export function SuccessDialog({ bill, settings, onNewBill }: SuccessDialogProps) {
  // Keyed by bill, so every saved bill starts with a clean feedback panel.
  return bill ? <Saved key={bill.id} bill={bill} settings={settings} onNewBill={onNewBill} /> : null;
}

interface FeedbackLink {
  url: string;
  expiresAt: string;
}

function Saved({ bill, settings, onNewBill }: { bill: BillDetail; settings: AppSettings; onNewBill: () => void }) {
  const [link, setLink] = useState<FeedbackLink | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [making, setMaking] = useState(false);

  const money = (v: string) => formatMoney(v, { currency: bill.currency, locale: settings.locale.locale });
  const change = new D(bill.changeDue);
  const canAskFeedback = settings.features.feedback && bill.status === "completed";

  // Draw the QR for the link. Black on white whatever the theme, because scanners need that contrast.
  useEffect(() => {
    if (!link) return;
    let current = true;
    QRCode.toDataURL(link.url, { errorCorrectionLevel: "M", margin: 2, width: 320 })
      .then((url) => current && setQr(url))
      .catch(() => current && toast.error("Could not draw the QR code. Use Copy link instead."));
    return () => {
      current = false;
    };
  }, [link]);

  async function getFeedback() {
    setMaking(true);
    try {
      const res = await api.post<FeedbackLink>(`/api/bills/${bill.id}/feedback-link`);
      setLink(res.data);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setMaking(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy. Press and hold the link to copy it.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onNewBill()}>
      <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <CircleCheck className="size-12 text-success" aria-hidden />
          <DialogTitle className="text-xl">Bill saved</DialogTitle>
          <DialogDescription>
            <span className="block text-lg font-semibold text-foreground">{bill.billNo}</span>
            <span className="block tabular-nums">Total {money(bill.totalAmount)}</span>
          </DialogDescription>
        </DialogHeader>

        {change.greaterThan(0) ? (
          <p
            role="status"
            className="rounded-lg bg-success/10 px-4 py-3 text-center text-base font-semibold text-success"
          >
            Give back {money(bill.changeDue)}
          </p>
        ) : null}

        {link ? (
          <section
            aria-label="Customer feedback"
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 text-center"
          >
            <p className="text-sm font-medium">Ask the customer to scan this to share feedback</p>
            {qr ? (
              // A data URL made on this device a moment ago, so there is nothing for next/image to optimise.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt={`QR code that opens the feedback form for bill ${bill.billNo}`}
                width={192}
                height={192}
                className="size-48 rounded-lg"
              />
            ) : (
              <div
                className="grid size-48 place-items-center rounded-lg bg-muted"
                role="status"
                aria-label="Drawing QR code"
              >
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Works until {formatDateTime(link.expiresAt, settings.locale)}. One response per bill.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden /> Open on this device
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy aria-hidden /> Copy link
              </Button>
            </div>
          </section>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" asChild>
              <a href={`/receipt/${bill.id}`} target="_blank" rel="noopener noreferrer">
                <Eye aria-hidden /> View receipt
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/bills/${bill.id}/pdf`} download>
                <Download aria-hidden /> Download PDF
              </a>
            </Button>
            {canAskFeedback && !link ? (
              <Button variant="outline" onClick={getFeedback} disabled={making}>
                {making ? <Loader2 className="animate-spin" aria-hidden /> : <MessageSquareHeart aria-hidden />} Get
                feedback
              </Button>
            ) : null}
          </div>
          <Button size="lg" onClick={onNewBill} autoFocus>
            <Plus aria-hidden /> New bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
