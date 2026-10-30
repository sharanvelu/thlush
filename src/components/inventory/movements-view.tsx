"use client";

import { ChevronLeft, ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { REASON_LABELS } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { MovementQuery } from "@/lib/validation/inventory";
import type { MovementRow, TrackedOption } from "@/services/StockService";

const REASONS = ["purchase", "wastage", "damage", "correction", "return", "sale", "void", "refund"] as const;

interface MovementsViewProps {
  rows: MovementRow[];
  total: number;
  query: MovementQuery;
  items: TrackedOption[];
  settings: { locale: string; timezone: string };
}

/** The stock ledger with filters kept in the URL. */
export function MovementsView({ rows, total, query, items, settings }: MovementsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const filtering = Boolean(query.item || query.reason || query.from || query.to);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(total, query.page * query.pageSize);

  return (
    <section aria-labelledby="ledger-heading">
      <h2 id="ledger-heading" className="mb-3 text-lg font-semibold">Stock ledger</h2>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Select value={query.item ? String(query.item) : "all"} onValueChange={(v) => setParams({ item: v === "all" ? null : v })}>
          <SelectTrigger className="w-52" aria-label="Filter by item"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            {items.map((i) => (
              <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={query.reason ?? "all"} onValueChange={(v) => setParams({ reason: v === "all" ? null : v })}>
          <SelectTrigger className="w-40" aria-label="Filter by reason"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {REASONS.map((r) => (
              <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" aria-label="From date" className="w-40" value={query.from ?? ""} max={query.to} onChange={(e) => setParams({ from: e.target.value || null })} />
        <Input type="date" aria-label="To date" className="w-40" value={query.to ?? ""} min={query.from} onChange={(e) => setParams({ to: e.target.value || null })} />
        {filtering ? (
          <Button variant="ghost" onClick={() => setParams({ item: null, reason: null, from: null, to: null })}>Clear</Button>
        ) : null}
      </div>

      <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        {total === 0 ? (
          <EmptyState icon={History} title={filtering ? "No movements match" : "No stock movements yet"} description={filtering ? "Try a wider date range or clear the filters." : "Sales, purchases and adjustments will be listed here."} />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>When</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Balance</TableHead>
                  <TableHead className="hidden lg:table-cell">Note</TableHead>
                  <TableHead className="hidden md:table-cell">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const negative = r.delta.startsWith("-");
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt, { locale: settings.locale, timeZone: settings.timezone })}</TableCell>
                      <TableCell className="font-medium">{r.itemName}</TableCell>
                      <TableCell><Badge variant="secondary">{REASON_LABELS[r.reason] ?? r.reason}</Badge></TableCell>
                      <TableCell className={cn("text-right tabular-nums", negative ? "text-destructive" : "text-success")}>
                        {negative ? "" : "+"}{r.delta} <span className="text-xs text-muted-foreground">{r.unit}</span>
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">{r.balanceAfter ?? "–"}</TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground lg:table-cell">
                        {r.billNo && r.billId ? <Link href={`/bills?q=${encodeURIComponent(r.billNo)}`} className="underline-offset-2 hover:underline">{r.billNo}</Link> : r.note}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{r.userName ?? "–"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {total > 0 ? (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">Showing {first}–{last} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={query.page <= 1} onClick={() => setParams({ page: String(query.page - 1) }, false)} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden /></Button>
            <span className="min-w-16 text-center tabular-nums">{query.page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={query.page >= totalPages} onClick={() => setParams({ page: String(query.page + 1) }, false)} aria-label="Next page"><ChevronRight className="size-4" aria-hidden /></Button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
