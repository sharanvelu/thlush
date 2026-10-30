"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { PurchaseDetail } from "@/services/PurchasingService";

interface PurchaseDetailDialogProps {
  purchaseId: number | null;
  onClose: () => void;
  settings: { currency: string; locale: string; timezone: string };
}

export function PurchaseDetailDialog({ purchaseId, onClose, settings }: PurchaseDetailDialogProps) {
  const [loaded, setLoaded] = useState<{ id: number; detail?: PurchaseDetail; error?: string } | null>(null);

  useEffect(() => {
    if (purchaseId === null) return;
    let cancelled = false;
    api
      .get<PurchaseDetail>(`/api/inventory/purchases/${purchaseId}`)
      .then((res) => !cancelled && setLoaded({ id: purchaseId, detail: res.data }))
      .catch((err) => !cancelled && setLoaded({ id: purchaseId, error: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  const current = loaded && loaded.id === purchaseId ? loaded : null;
  const detail = current?.detail;
  const money = (v: string) => formatMoney(v, settings);

  return (
    <Dialog open={purchaseId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{detail?.invoiceNo ? `Invoice ${detail.invoiceNo}` : "Purchase"}</DialogTitle>
          <DialogDescription>
            {detail ? `${formatDate(detail.purchasedAt, { locale: settings.locale, timeZone: settings.timezone })} · ${detail.supplierName ?? "No supplier"}` : "Loading details"}
          </DialogDescription>
        </DialogHeader>
        {current?.error ? (
          <p role="alert" className="text-sm text-destructive">{current.error}</p>
        ) : !detail ? (
          <div className="flex justify-center py-8" role="status" aria-label="Loading"><LoaderCircle className="animate-spin text-muted-foreground" aria-hidden /></div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(i.costPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(i.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-right font-semibold tabular-nums">Total {money(detail.total)}</p>
            {detail.notes ? <p className="text-sm text-muted-foreground">{detail.notes}</p> : null}
            {detail.createdBy ? <p className="text-xs text-muted-foreground">Recorded by {detail.createdBy}</p> : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
