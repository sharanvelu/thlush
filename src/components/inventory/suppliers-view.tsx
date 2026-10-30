"use client";

import { ChevronLeft, ChevronRight, Pencil, PackagePlus, Plus, Trash2, Truck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { PurchaseDetailDialog } from "@/components/inventory/purchase-detail-dialog";
import { ReceiveStockDialog } from "@/components/inventory/receive-stock-dialog";
import { SupplierDialog } from "@/components/inventory/supplier-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PurchaseRow, SupplierRecord } from "@/services/PurchasingService";
import type { TrackedOption } from "@/services/StockService";

interface SuppliersViewProps {
  tab: "purchases" | "suppliers";
  page: number;
  pageSize: number;
  purchases: { rows: PurchaseRow[]; total: number };
  suppliers: { rows: SupplierRecord[]; total: number };
  supplierOptions: Array<{ id: number; name: string; status: "active" | "disabled" }>;
  items: TrackedOption[];
  canManage: boolean;
  today: string;
  settings: { currency: string; locale: string; timezone: string };
}

export function SuppliersView({ tab, page, pageSize, purchases, suppliers, supplierOptions, items, canManage, today, settings }: SuppliersViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [receiving, setReceiving] = useState(false);
  const [editing, setEditing] = useState<{ supplier: SupplierRecord | null } | null>(null);
  const [deleting, setDeleting] = useState<SupplierRecord | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );
  const refresh = () => startTransition(() => router.refresh());

  const money = (v: string) => formatMoney(v, settings);
  const dateOpts = { locale: settings.locale, timeZone: settings.timezone };
  const total = tab === "purchases" ? purchases.total : suppliers.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const res = await api.delete<{ purchasesKept: number }>(`/api/inventory/suppliers/${deleting.id}`);
      toast.success(res.data.purchasesKept > 0 ? `${deleting.name} removed. Its ${res.data.purchasesKept} purchases were kept.` : `${deleting.name} removed`);
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        title="Suppliers & Purchases"
        description="Record deliveries to add stock, and keep your suppliers in one place."
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing({ supplier: null })}><Plus aria-hidden /> Add supplier</Button>
              <Button onClick={() => setReceiving(true)}><PackagePlus aria-hidden /> Receive stock</Button>
            </div>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v === "purchases" ? null : v, page: null })} className="mb-4">
        <TabsList>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        {tab === "purchases" ? (
          purchases.total === 0 ? (
            <EmptyState icon={PackagePlus} title="No purchases yet" description="When a delivery arrives, record it here to add the stock and track what you paid." action={canManage ? <Button onClick={() => setReceiving(true)}>Receive stock</Button> : undefined} />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Received</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden sm:table-cell">Invoice</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden lg:table-cell">By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">
                        <button type="button" onClick={() => setViewing(p.id)} className="font-medium underline-offset-2 hover:underline focus-visible:underline">
                          {formatDate(p.purchasedAt, dateOpts)}
                        </button>
                      </TableCell>
                      <TableCell>{p.supplierName ?? <span className="text-muted-foreground">No supplier</span>}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{p.invoiceNo ?? "–"}</TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">{p.itemCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(p.total)}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{p.createdBy ?? "–"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : suppliers.total === 0 ? (
          <EmptyState icon={Truck} title="No suppliers yet" description="Add the people you buy from so each delivery can be traced back to them." action={canManage ? <Button onClick={() => setEditing({ supplier: null })}>Add supplier</Button> : undefined} />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Supplier</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? <TableHead className="w-24"><span className="sr-only">Actions</span></TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{s.contactName ?? "–"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{s.phone ?? "–"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.purchases}</TableCell>
                    <TableCell><Badge variant={s.status === "active" ? "secondary" : "outline"}>{s.status === "active" ? "Active" : "Disabled"}</Badge></TableCell>
                    {canManage ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ supplier: s })}><Pencil className="size-4" aria-hidden /></Button>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s)}><Trash2 className="size-4" aria-hidden /></Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {total > 0 ? (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">Showing {first}–{last} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden /></Button>
            <span className="min-w-16 text-center tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setParams({ page: String(page + 1) })} aria-label="Next page"><ChevronRight className="size-4" aria-hidden /></Button>
          </div>
        </nav>
      ) : null}

      <ReceiveStockDialog open={receiving} onOpenChange={setReceiving} items={items} suppliers={supplierOptions} settings={settings} today={today} onSaved={refresh} />
      <SupplierDialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} supplier={editing?.supplier ?? null} onSaved={refresh} />
      <PurchaseDetailDialog purchaseId={viewing} onClose={() => setViewing(null)} settings={settings} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.purchases > 0 ? `Its ${deleting.purchases} past purchases stay on record without a supplier name.` : "This supplier has no purchases."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove supplier</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
