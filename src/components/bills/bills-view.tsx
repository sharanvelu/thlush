"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, History, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { BillDetailSheet, type HistorySettings } from "@/components/bills/bill-detail-sheet";
import { BillFilterPanel } from "@/components/bills/bill-filters";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { activeFilterCount, type BillListQuery, type BillSort } from "@/lib/validation/bill-history";
import { cn } from "@/lib/utils";
import type { BillListRow } from "@/services/BillHistoryService";
import type { UserOption } from "@/services/UserService";
import { PAYMENT_METHOD_LABELS } from "@/types/bill";

interface BillsViewProps {
  rows: BillListRow[];
  total: number;
  revenue: string;
  query: BillListQuery;
  cashiers: UserOption[] | null;
  canVoid: boolean;
  currency: string;
  settings: HistorySettings;
}

const PAGE_SIZES = [10, 20, 50, 100];
const FILTER_KEYS = ["from", "to", "customer", "item", "min", "max", "method", "status", "cashier"] as const;

const SORT_LABELS: Record<BillSort, string> = {
  date_desc: "Newest first",
  date_asc: "Oldest first",
  total_desc: "Total: high to low",
  total_asc: "Total: low to high",
  customer_asc: "Customer: A to Z",
  customer_desc: "Customer: Z to A",
};

type SortField = "date" | "total" | "customer";

function SortHead({
  sort,
  field,
  label,
  onToggle,
  className,
}: {
  sort: BillSort;
  field: SortField;
  label: string;
  onToggle: (field: SortField) => void;
  className?: string;
}) {
  const active = sort.startsWith(`${field}_`);
  const dir = sort.endsWith("_asc") ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Button variant="ghost" size="sm" className={cn("-ml-2.5 h-8 gap-1.5 px-2.5 font-medium", className)} onClick={() => onToggle(field)}>
      {label}
      <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
      <span className="sr-only">
        {active ? `, sorted ${dir === "asc" ? "ascending" : "descending"}. Activate to reverse.` : ", not sorted. Activate to sort."}
      </span>
    </Button>
  );
}

export function BillsView({ rows, total, revenue, query, cashiers, canVoid, currency, settings }: BillsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<number | null>(null);

  const setParams = useCallback(
    (updates: Record<string, string | null | undefined>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const filterCount = activeFilterCount(query);
  const exportQuery = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) if (query[key]) params.set(key, String(query[key]));
    params.set("sort", query.sort);
    return params.toString();
  }, [query]);

  const money = (value: string, c = currency) => formatMoney(value, { currency: c, locale: settings.locale });
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(total, query.page * query.pageSize);

  const toggleSort = (field: SortField) => {
    const desc = `${field}_desc` as BillSort;
    const asc = `${field}_asc` as BillSort;
    // Dates and totals start high or new first; customers start A to Z.
    const firstChoice = field === "customer" ? asc : desc;
    const other = firstChoice === asc ? desc : asc;
    setParams({ sort: query.sort === firstChoice ? other : firstChoice }, true);
  };
  const ariaSort = (field: string) =>
    query.sort.startsWith(`${field}_`) ? (query.sort.endsWith("_asc") ? ("ascending" as const) : ("descending" as const)) : undefined;

  return (
    <>
      <PageHeader
        title="Bill History"
        description={canVoid ? "Search, reprint, export, void or refund past bills." : "Your past bills."}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download aria-hidden /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/api/bills/export?${exportQuery}&format=csv`} download>
                  <Download aria-hidden /> CSV
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/bills/export?${exportQuery}&format=xlsx`} download>
                  <FileSpreadsheet aria-hidden /> Excel (.xlsx)
                </a>
              </DropdownMenuItem>
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Exports follow the filters below.</p>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <BillFilterPanel
        key={JSON.stringify(FILTER_KEYS.map((k) => query[k]))}
        filters={query}
        cashiers={cashiers}
        timeZone={settings.timezone}
        onApply={(next) => setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, next[k] ? String(next[k]) : null])))}
        onReset={() => setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total} {total === 1 ? "bill" : "bills"} · Revenue (completed) <span className="font-medium text-foreground tabular-nums">{money(revenue)}</span>
        </p>
        <Select value={query.sort} onValueChange={(v) => setParams({ sort: v === "date_desc" ? null : v })}>
          <SelectTrigger size="sm" className="w-48" aria-label="Sort bills">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
        {total === 0 ? (
          <EmptyState
            icon={filterCount > 0 ? History : Receipt}
            title={filterCount > 0 ? "No bills match these filters" : "No bills yet"}
            description={filterCount > 0 ? "Try widening the dates or clearing a filter." : "Bills show up here as soon as they are saved."}
            action={
              filterCount > 0 ? (
                <Button variant="outline" onClick={() => setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}>
                  Reset filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/billing">Create a bill</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Bill #</TableHead>
                  <TableHead aria-sort={ariaSort("date")}>
                    <SortHead sort={query.sort} field="date" label="Date" onToggle={toggleSort} />
                  </TableHead>
                  <TableHead aria-sort={ariaSort("customer")}>
                    <SortHead sort={query.sort} field="customer" label="Customer" onToggle={toggleSort} />
                  </TableHead>
                  <TableHead className="hidden text-right md:table-cell">Items</TableHead>
                  <TableHead className="hidden lg:table-cell">Payment</TableHead>
                  <TableHead aria-sort={ariaSort("total")} className="text-right">
                    <div className="flex justify-end">
                      <SortHead sort={query.sort} field="total" label="Total" onToggle={toggleSort} className="-mr-2.5 ml-0" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Cashier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => setOpenId(row.id)}>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-xs font-medium underline-offset-4 hover:underline focus-visible:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(row.id);
                        }}
                        aria-label={`Open bill ${row.billNo}`}
                      >
                        {row.billNo}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(row.createdAt, { locale: settings.locale, timeZone: settings.timezone })}
                    </TableCell>
                    <TableCell className={cn(!row.customerName && "text-muted-foreground")}>{row.customerName ?? settings.walkInLabel}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{row.itemCount}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {row.methods.length > 0 ? row.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(", ") : "—"}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", row.status !== "completed" && "text-muted-foreground line-through")}>
                      {money(row.total, row.currency)}
                    </TableCell>
                    <TableCell>
                      <BillStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{row.cashierName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {total > 0 ? (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            Showing {first}–{last} of {total}
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-muted-foreground">
              Rows
              <Select value={String(query.pageSize)} onValueChange={(v) => setParams({ pageSize: v === "20" ? null : v })}>
                <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button variant="outline" size="icon" disabled={query.page <= 1} onClick={() => setParams({ page: String(query.page - 1) }, false)} aria-label="Previous page">
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="min-w-16 text-center tabular-nums">
              {query.page} / {totalPages}
            </span>
            <Button variant="outline" size="icon" disabled={query.page >= totalPages} onClick={() => setParams({ page: String(query.page + 1) }, false)} aria-label="Next page">
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}

      <BillDetailSheet billId={openId} onClose={() => setOpenId(null)} canVoid={canVoid} settings={settings} onChanged={() => router.refresh()} />
    </>
  );
}
