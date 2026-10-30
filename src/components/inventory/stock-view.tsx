"use client";

import { Boxes, ChevronLeft, ChevronRight, CircleAlert, PackageX, Search, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { StockBadge } from "@/components/inventory/stock-badge";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { StockListQuery } from "@/lib/validation/inventory";
import type { CategoryOption } from "@/services/CategoryService";
import type { StockRow, StockSummary } from "@/services/StockService";

const SORTS: Record<StockListQuery["sort"], string> = {
  name_asc: "Name: A to Z",
  category_asc: "Category",
  stock_asc: "Stock: lowest first",
  stock_desc: "Stock: highest first",
  value_desc: "Value: highest first",
};

interface StockViewProps {
  rows: StockRow[];
  total: number;
  summary: StockSummary;
  query: StockListQuery;
  categories: CategoryOption[];
  canAdjust: boolean;
  settings: { currency: string; locale: string };
}

export function StockView({ rows, total, summary, query, categories, canAdjust, settings }: StockViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const debounced = useDebouncedValue(search, 300);

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

  useEffect(() => {
    const next = debounced.trim();
    if (next !== (query.q ?? "")) setParams({ q: next || null });
    // Only the typed text should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const money = (v: string) => formatMoney(v, settings);
  const filtering = Boolean(query.q || query.category || query.status);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(total, query.page * query.pageSize);

  const cards = [
    { icon: Boxes, label: "Tracked items", value: String(summary.tracked), tone: "" },
    { icon: Wallet, label: "Stock value (at cost)", value: money(summary.value), tone: "" },
    { icon: CircleAlert, label: "Low stock", value: String(summary.low), tone: summary.low > 0 ? "text-warning" : "" },
    { icon: PackageX, label: "Out of stock", value: String(summary.out), tone: summary.out > 0 ? "text-destructive" : "" },
  ];

  return (
    <>
      <PageHeader
        title="Stock Overview"
        description="What you have, what's running low, and what it's worth."
        actions={
          canAdjust ? (
            <Button asChild variant="outline">
              <Link href="/inventory/adjustments">Adjust stock</Link>
            </Button>
          ) : null
        }
      />

      <section aria-label="Stock summary" className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, tone }) => (
          <Card key={label} className="shadow-card">
            <CardHeader className="flex flex-row items-center gap-2 pb-1">
              <Icon className={cn("size-4 text-muted-foreground", tone)} aria-hidden />
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("truncate text-2xl font-semibold tracking-tight tabular-nums", tone)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or SKU" aria-label="Search stock" className="pl-8" />
        </div>
        <Select value={query.category ? String(query.category) : "all"} onValueChange={(v) => setParams({ category: v === "all" ? null : v })}>
          <SelectTrigger className="w-44" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" variant="outline" value={query.status ?? "all"} onValueChange={(v) => v && setParams({ status: v === "all" ? null : v })} aria-label="Filter by status">
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="in">In stock</ToggleGroupItem>
          <ToggleGroupItem value="low">Low</ToggleGroupItem>
          <ToggleGroupItem value="out">Out</ToggleGroupItem>
        </ToggleGroup>
        <Select value={query.sort} onValueChange={(v) => setParams({ sort: v === "name_asc" ? null : v })}>
          <SelectTrigger className="ml-auto w-48" aria-label="Sort stock">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        {total === 0 ? (
          <EmptyState
            icon={Boxes}
            title={filtering ? "No items match" : "No items track stock yet"}
            description={filtering ? "Try a different search or clear the filters." : "Open an item in the menu and turn on Track stock to count it here."}
            action={
              filtering ? (
                <Button variant="outline" onClick={() => { setSearch(""); setParams({ q: null, category: null, status: null }); }}>Clear filters</Button>
              ) : (
                <Button asChild><Link href="/menu">Go to the menu</Link></Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-right">In stock</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Reorder at</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Cost</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="font-medium">{r.name}</span>
                      {r.sku ? <span className="block font-mono text-xs text-muted-foreground">{r.sku}</span> : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{r.categoryName}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", r.status === "out" && "text-destructive")}>
                      {r.stock} <span className="text-xs text-muted-foreground">{r.unit}</span>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">{r.reorderLevel}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">{money(r.costPrice)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums lg:table-cell">{money(r.value)}</TableCell>
                    <TableCell><StockBadge status={r.status} /></TableCell>
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
            <Button variant="outline" size="icon" disabled={query.page <= 1} onClick={() => setParams({ page: String(query.page - 1) }, false)} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden /></Button>
            <span className="min-w-16 text-center tabular-nums">{query.page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={query.page >= totalPages} onClick={() => setParams({ page: String(query.page + 1) }, false)} aria-label="Next page"><ChevronRight className="size-4" aria-hidden /></Button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
