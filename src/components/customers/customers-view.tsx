"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CustomerListQuery } from "@/lib/validation/customer";
import type { CustomerRecord } from "@/services/CustomerService";

const SORT_LABELS: Record<CustomerListQuery["sort"], string> = {
  name_asc: "Name: A to Z",
  name_desc: "Name: Z to A",
  spend_desc: "Spend: high to low",
  spend_asc: "Spend: low to high",
  orders_desc: "Orders: most first",
  orders_asc: "Orders: fewest first",
  visit_desc: "Last visit: newest",
  visit_asc: "Last visit: oldest",
  created_desc: "Recently added",
};

interface CustomersViewProps {
  rows: CustomerRecord[];
  total: number;
  query: CustomerListQuery;
  canManage: boolean;
  settings: { currency: string; locale: string; timezone: string };
}

export function CustomersView({ rows, total, query, canManage, settings }: CustomersViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const debounced = useDebouncedValue(search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [deleting, setDeleting] = useState<CustomerRecord | null>(null);
  const [pending, setPending] = useState(false);

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
    // Only the typed text should trigger this, not the URL echoing it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const money = (v: string) => formatMoney(v, settings);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(total, query.page * query.pageSize);

  const confirmDelete = async () => {
    if (!deleting) return;
    setPending(true);
    try {
      const response = await api.delete<{ billsKept: number }>(`/api/customers/${deleting.id}`);
      const kept = response.data.billsKept;
      toast.success(`Deleted ${deleting.name}.${kept > 0 ? ` Their ${kept} ${kept === 1 ? "bill" : "bills"} stay in history as walk-in.` : ""}`);
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Who orders, how often and how much."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden /> Add customer
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email or tag" aria-label="Search customers" className="pl-8" />
        </div>
        <Select value={query.sort} onValueChange={(v) => setParams({ sort: v === "name_asc" ? null : v })}>
          <SelectTrigger className="w-52" aria-label="Sort customers">
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
            icon={Users}
            title={query.q ? "No customers match" : "No customers yet"}
            description={query.q ? "Try a different name, phone number or tag." : "Customers appear here when you add them, or when you type a new name while billing."}
            action={
              query.q ? (
                <Button variant="outline" onClick={() => { setSearch(""); setParams({ q: null }); }}>
                  Clear search
                </Button>
              ) : canManage ? (
                <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                  <Plus aria-hidden /> Add customer
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Lifetime spend</TableHead>
                  <TableHead className="hidden lg:table-cell">Last visit</TableHead>
                  {canManage ? <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                      {c.tags.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <Badge key={t} variant="secondary">{t}</Badge>
                          ))}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {c.phone ?? "—"}
                      {c.email ? <span className="block text-xs">{c.email}</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.spend)}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {c.lastVisit ? formatDate(c.lastVisit, settings) : "Never"}
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${c.name}`}>
                              <MoreHorizontal className="size-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setEditing(c); setFormOpen(true); }}>
                              <Pencil aria-hidden /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                              <Trash2 aria-hidden /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            <Button variant="outline" size="icon" disabled={query.page <= 1} onClick={() => setParams({ page: String(query.page - 1) }, false)} aria-label="Previous page">
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="min-w-16 text-center tabular-nums">{query.page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={query.page >= totalPages} onClick={() => setParams({ page: String(query.page + 1) }, false)} aria-label="Next page">
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}

      {canManage ? (
        <>
          <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editing} onSaved={() => router.refresh()} />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete ${deleting?.name ?? "this customer"}?`}
            description={
              <>
                {deleting && deleting.orders > 0
                  ? `Their ${deleting.orders} ${deleting.orders === 1 ? "bill stays" : "bills stay"} in Bill History and will show as walk-in. `
                  : ""}
                This can&apos;t be undone.
              </>
            }
            confirmLabel="Delete customer"
            destructive
            pending={pending}
            onConfirm={confirmDelete}
          />
        </>
      ) : null}
    </>
  );
}
