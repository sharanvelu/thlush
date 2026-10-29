"use client";

import type { RowSelectionState } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Eye,
  EyeOff,
  FolderInput,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  Upload,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { MenuGrid } from "@/components/menu/menu-grid";
import { MenuImportDialog } from "@/components/menu/menu-import-dialog";
import { MenuItemSheet, type MenuFormDefaults } from "@/components/menu/menu-item-sheet";
import { MenuTable } from "@/components/menu/menu-table";
import type { MenuItemActions } from "@/components/menu/menu-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCollapsedGroups } from "@/hooks/use-collapsed-groups";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, errorMessage } from "@/lib/api-client";
import { FLAT_PAGE_SIZE, GROUPED_PAGE_SIZE, type MenuListQuery, type MenuSortField } from "@/lib/validation/menu";
import { cn } from "@/lib/utils";
import type { CategoryOption } from "@/services/CategoryService";
import type { BulkResult, DeleteMode, MenuListItem } from "@/services/MenuService";

interface MenuViewProps {
  items: MenuListItem[];
  total: number;
  groupTotals: Record<number, number>;
  query: MenuListQuery;
  categories: CategoryOption[];
  canManage: boolean;
  defaults: MenuFormDefaults & { locale: string };
  /** Open the "new item" sheet straight away (used by the quick actions). */
  openNew: boolean;
}

const PAGE_SIZES = [10, 20, 50, 100];

export function MenuView({ items, total, groupTotals, query, categories, canManage, defaults, openNew }: MenuViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ---- URL-driven filters, sort and paging ---------------------------------
  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  const [search, setSearch] = useState(query.q ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next !== (query.q ?? "")) setParams({ q: next || null });
    // Only react to the debounced text; `query.q` changing from elsewhere must not re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    // Drop the one-shot ?new=1 so a refresh does not reopen the sheet.
    if (openNew) setParams({ new: null }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtersActive = Boolean(query.q) || query.category !== undefined || query.status !== "all";
  const resetFilters = () => {
    setSearch("");
    setParams({ q: null, category: null, status: null });
  };

  const onSort = useCallback(
    (field: MenuSortField) => {
      const dir = query.sort === field && query.dir === "asc" ? "desc" : "asc";
      setParams({ sort: field, dir });
    },
    [query.dir, query.sort, setParams],
  );

  // ---- Local, optimistic state, reset whenever fresh data arrives ---------
  const [overrides, setOverrides] = useState<Record<number, "active" | "disabled">>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [seenItems, setSeenItems] = useState(items);
  if (items !== seenItems) {
    setSeenItems(items);
    setOverrides({});
    setRowSelection({});
  }
  const statusOf = useCallback((item: MenuListItem) => overrides[item.id] ?? item.status, [overrides]);
  const selectedIds = useMemo(() => Object.keys(rowSelection).filter((k) => rowSelection[k]).map(Number), [rowSelection]);

  // ---- Dialogs --------------------------------------------------------------
  const [sheetOpen, setSheetOpen] = useState(openNew && canManage);
  const [editing, setEditing] = useState<MenuListItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<MenuListItem | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const refresh = () => router.refresh();

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const toggleStatus = useCallback(
    async (item: MenuListItem, active: boolean) => {
      const status = active ? "active" : "disabled";
      setOverrides((o) => ({ ...o, [item.id]: status }));
      try {
        await api.patch(`/api/menu/${item.id}`, { status });
      } catch (error) {
        setOverrides((o) => {
          const { [item.id]: _removed, ...rest } = o;
          return rest;
        });
        toast.error(errorMessage(error));
      }
    },
    [],
  );

  const actions = useMemo<MenuItemActions | null>(
    () =>
      canManage
        ? {
            onEdit: (item) => {
              setEditing(item);
              setSheetOpen(true);
            },
            onDuplicate: async (item) => {
              try {
                const response = await api.post<MenuListItem>(`/api/menu/${item.id}/duplicate`);
                toast.success("Duplicated. The copy is disabled until you turn it on.");
                refresh();
                setEditing(response.data);
                setSheetOpen(true);
              } catch (error) {
                toast.error(errorMessage(error));
              }
            },
            onDelete: setDeleting,
            onToggleStatus: toggleStatus,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, toggleStatus],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setPending(true);
    try {
      const response = await api.delete<{ mode: DeleteMode }>(`/api/menu/${deleting.id}`);
      toast.success(
        response.data.mode === "archived"
          ? `"${deleting.name}" has been billed before, so it was archived instead of deleted.`
          : `Deleted "${deleting.name}"`,
      );
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const runBulk = async (body: { action: "enable" | "disable" | "delete" } | { action: "move"; categoryId: number }) => {
    if (selectedIds.length === 0) return;
    setPending(true);
    try {
      const response = await api.post<BulkResult>("/api/menu/bulk", { ...body, ids: selectedIds });
      const { affected, archived } = response.data;
      const noun = affected === 1 ? "item" : "items";
      const verb = { enable: "enabled", disable: "disabled", delete: "removed", move: "moved" }[body.action];
      toast.success(
        `${affected} ${noun} ${verb}${archived > 0 ? ` (${archived} billed before, so archived)` : ""}`,
      );
      setRowSelection({});
      setBulkDeleteOpen(false);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  // ---- Derived values ---------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(total, query.page * query.pageSize);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.category !== undefined) params.set("category", String(query.category));
    if (query.status !== "all") params.set("status", query.status);
    const qs = params.toString();
    return `/api/menu/export${qs ? `?${qs}` : ""}`;
  }, [query.category, query.q, query.status]);

  const money = { currency: defaults.currency, locale: defaults.locale };
  const grouped = query.group === "category";

  // Accordion state. While searching, every group stays open so matches are never hidden.
  const accordion = useCollapsedGroups();
  const collapsed = useMemo<ReadonlySet<number>>(
    () => (query.q ? new Set<number>() : accordion.collapsed),
    [accordion.collapsed, query.q],
  );
  const pageCategoryIds = useMemo(() => [...new Set(items.map((i) => i.categoryId))], [items]);
  const allCollapsed = pageCategoryIds.length > 0 && pageCategoryIds.every((id) => collapsed.has(id));

  return (
    <>
      <PageHeader
        title="Menu"
        description={canManage ? "Items, prices, tax rates and availability." : "The items available for billing."}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={exportHref} download>
                <Download aria-hidden /> Export CSV
              </a>
            </Button>
            {canManage ? (
              <>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload aria-hidden /> Import
                </Button>
                <Button onClick={openCreate}>
                  <Plus aria-hidden /> Add item
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU or category"
            aria-label="Search the menu"
            className="pl-8"
          />
        </div>

        <Select
          value={query.category !== undefined ? String(query.category) : "all"}
          onValueChange={(value) => setParams({ category: value === "all" ? null : value })}
        >
          <SelectTrigger className="w-44" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          variant="outline"
          value={query.status}
          onValueChange={(value) => value && setParams({ status: value === "all" ? null : value })}
          aria-label="Filter by status"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
          <ToggleGroupItem value="disabled">Disabled</ToggleGroupItem>
        </ToggleGroup>

        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X aria-hidden /> Reset
          </Button>
        ) : null}

        {grouped && !query.q && pageCategoryIds.length > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => accordion.setAll(pageCategoryIds, !allCollapsed)}
          >
            {allCollapsed ? <ChevronsUpDown aria-hidden /> : <ChevronsDownUp aria-hidden />}
            {allCollapsed ? "Expand all" : "Collapse all"}
          </Button>
        ) : null}

        <label className={cn("flex items-center gap-2 text-sm", !(grouped && !query.q && pageCategoryIds.length > 1) && "ml-auto")}>
          <Switch
            checked={grouped}
            onCheckedChange={(checked) => setParams({ group: checked ? null : "none" }, false)}
            aria-label="Group items by category"
          />
          Group by category
        </label>

        <ToggleGroup
          type="single"
          variant="outline"
          value={query.view}
          onValueChange={(value) => value && setParams({ view: value === "table" ? null : value }, false)}
          aria-label="Choose layout"
        >
          <ToggleGroupItem value="table" aria-label="Table view">
            <List aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Bulk actions */}
      {canManage && selectedIds.length > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent px-3 py-2"
        >
          <span className="mr-1 text-sm font-medium">{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk({ action: "enable" })}>
            <Eye aria-hidden /> Enable
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => runBulk({ action: "disable" })}>
            <EyeOff aria-hidden /> Disable
          </Button>
          <Select value="" onValueChange={(value) => void runBulk({ action: "move", categoryId: Number(value) })} disabled={pending}>
            <SelectTrigger size="sm" className="w-44" aria-label="Move selected items to a category">
              <FolderInput className="size-3.5" aria-hidden />
              <SelectValue placeholder="Move to category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 aria-hidden /> Delete
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </div>
      ) : null}

      {/* Results */}
      <div className={cn("transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
        {total === 0 && !filtersActive ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No menu items yet"
            description={
              canManage
                ? "Add your first item, or import a whole menu from a CSV file."
                : "Nothing has been added to the menu yet."
            }
            action={
              canManage ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={openCreate}>
                    <Plus aria-hidden /> Add item
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload aria-hidden /> Import CSV
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : total === 0 ? (
          <EmptyState
            icon={Search}
            title="No items match your filters"
            description="Try a different search or clear the filters."
            action={<Button variant="outline" onClick={resetFilters}>Reset filters</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="That page is empty"
            description="Items were removed since you loaded this page."
            action={<Button variant="outline" onClick={() => setParams({ page: null }, false)}>Go to the first page</Button>}
          />
        ) : query.view === "grid" ? (
          <MenuGrid items={items} money={money} statusOf={statusOf} actions={actions} grouped={grouped} groupTotals={groupTotals} collapsed={collapsed} onToggleGroup={accordion.toggle} />
        ) : (
          <MenuTable
            items={items}
            money={money}
            sort={{ field: query.sort, dir: query.dir }}
            onSort={onSort}
            statusOf={statusOf}
            actions={actions}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            grouped={grouped}
            groupTotals={groupTotals}
            collapsed={collapsed}
            onToggleGroup={accordion.toggle}
          />
        )}
      </div>

      {/* Pagination */}
      {total > 0 ? (
        <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            Showing {first}–{last} of {total}
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-muted-foreground">
              Rows
              <Select
                value={String(query.pageSize)}
                onValueChange={(value) =>
                  setParams({ pageSize: Number(value) === (grouped ? GROUPED_PAGE_SIZE : FLAT_PAGE_SIZE) ? null : value })
                }
              >
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
            <Button
              variant="outline"
              size="icon"
              disabled={query.page <= 1}
              onClick={() => setParams({ page: String(query.page - 1) }, false)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <span className="min-w-16 text-center tabular-nums">
              {query.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={query.page >= totalPages}
              onClick={() => setParams({ page: String(query.page + 1) }, false)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}

      {canManage ? (
        <>
          <MenuItemSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            item={editing}
            categories={categories}
            defaults={defaults}
            initialCategoryId={query.category}
            onSaved={refresh}
          />
          <MenuImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => !open && setDeleting(null)}
            title={`Delete "${deleting?.name ?? ""}"?`}
            description="If this item has been billed, it is archived instead of removed, so old bills keep their details. Otherwise it is deleted for good."
            confirmLabel="Delete"
            destructive
            pending={pending}
            onConfirm={confirmDelete}
          />
          <ConfirmDialog
            open={bulkDeleteOpen}
            onOpenChange={setBulkDeleteOpen}
            title={`Delete ${selectedIds.length} ${selectedIds.length === 1 ? "item" : "items"}?`}
            description="Items that have been billed are archived instead of removed, so old bills keep their details. The rest are deleted for good."
            confirmLabel="Delete"
            destructive
            pending={pending}
            onConfirm={() => runBulk({ action: "delete" })}
          />
        </>
      ) : null}
    </>
  );
}
