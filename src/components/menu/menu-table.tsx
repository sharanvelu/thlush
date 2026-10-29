"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Fragment, useMemo } from "react";
import { GroupLabel } from "@/components/menu/menu-group";
import { ItemThumb, VegMark, taxLabel } from "@/components/menu/menu-primitives";
import type { MenuItemActions, MoneyFormat, SortState } from "@/components/menu/menu-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { MenuSortField } from "@/lib/validation/menu";
import { cn } from "@/lib/utils";
import type { MenuListItem } from "@/services/MenuService";

interface MenuTableProps {
  items: MenuListItem[];
  money: MoneyFormat;
  sort: SortState;
  onSort: (field: MenuSortField) => void;
  /** Status after any optimistic change that has not been confirmed yet. */
  statusOf: (item: MenuListItem) => "active" | "disabled";
  /** Present only for users who may manage the menu. */
  actions: MenuItemActions | null;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** List items under a heading per category (and drop the category column). */
  grouped: boolean;
  /** Items per category across all pages, for the group headings. */
  groupTotals: Record<number, number>;
  /** Category ids whose items are hidden (accordion closed). */
  collapsed: ReadonlySet<number>;
  onToggleGroup: (categoryId: number) => void;
}

function SortHeader({
  field,
  label,
  sort,
  onSort,
  className,
}: {
  field: MenuSortField;
  label: string;
  sort: SortState;
  onSort: (field: MenuSortField) => void;
  className?: string;
}) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-2.5 h-8 gap-1.5 px-2.5 font-medium", className)}
      onClick={() => onSort(field)}
    >
      {label}
      <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
      <span className="sr-only">
        {active ? `, sorted ${sort.dir === "asc" ? "ascending" : "descending"}. Activate to reverse.` : ", not sorted. Activate to sort."}
      </span>
    </Button>
  );
}

export function MenuTable({
  items,
  money,
  sort,
  onSort,
  statusOf,
  actions,
  rowSelection,
  onRowSelectionChange,
  grouped,
  groupTotals,
  collapsed,
  onToggleGroup,
}: MenuTableProps) {
  const columns = useMemo<ColumnDef<MenuListItem>[]>(() => {
    const select: ColumnDef<MenuListItem>[] = actions
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
                aria-label="Select all items on this page"
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
                aria-label={`Select ${row.original.name}`}
              />
            ),
          },
        ]
      : [];

    const categoryColumn: ColumnDef<MenuListItem>[] = grouped
      ? []
      : [
        {
          id: "category",
          header: () => <SortHeader field="category" label="Category" sort={sort} onSort={onSort} />,
          cell: ({ row }) => (
            <span className="flex items-center gap-2">
              {row.original.categoryName}
              {row.original.categoryStatus === "disabled" ? (
                <Badge variant="secondary" title="This category is hidden on the billing screen">
                  Category off
                </Badge>
              ) : null}
            </span>
          ),
        },
        ];

    const main: ColumnDef<MenuListItem>[] = [
      {
        id: "name",
        header: () => <SortHeader field="name" label="Item" sort={sort} onSort={onSort} />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <ItemThumb src={item.imageSrc} name={item.name} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <VegMark isVeg={item.isVeg} />
                  <span className="truncate font-medium">{item.name}</span>
                </div>
                {item.description ? (
                  <p className="max-w-xs truncate text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "price",
        header: () => (
          <div className="flex justify-end">
            <SortHeader field="price" label="Price" sort={sort} onSort={onSort} className="-mr-2.5 ml-0" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatMoney(row.original.price, { currency: row.original.currency, locale: money.locale })}
          </div>
        ),
      },
      {
        id: "tax",
        header: () => <span className="text-xs font-medium">Tax</span>,
        cell: ({ row }) => {
          const tax = taxLabel(row.original.sgst, row.original.cgst);
          return (
            <span className="tabular-nums text-muted-foreground" title={tax.detail}>
              {tax.total}
            </span>
          );
        },
      },
      {
        id: "sku",
        header: () => <span className="text-xs font-medium">SKU</span>,
        cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.sku ?? "—"}</span>,
      },
      {
        id: "status",
        header: () => <SortHeader field="status" label="Status" sort={sort} onSort={onSort} />,
        cell: ({ row }) => {
          const item = row.original;
          const active = statusOf(item) === "active";
          return actions ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={active}
                onCheckedChange={(checked) => actions.onToggleStatus(item, checked)}
                aria-label={`${item.name} is ${active ? "available" : "disabled"}`}
              />
              <span className="text-xs text-muted-foreground">{active ? "Active" : "Disabled"}</span>
            </div>
          ) : (
            <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Disabled"}</Badge>
          );
        },
      },
    ];

    const menu: ColumnDef<MenuListItem>[] = actions
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">Actions</span>,
            cell: ({ row }) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${row.original.name}`}>
                    <MoreHorizontal className="size-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => actions.onEdit(row.original)}>
                    <Pencil aria-hidden /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => actions.onDuplicate(row.original)}>
                    <Copy aria-hidden /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(row.original)}>
                    <Trash2 aria-hidden /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]
      : [];

    // The category column sits right after the item name.
    const [nameColumn, ...rest] = main;
    return [...select, ...(nameColumn ? [nameColumn] : []), ...categoryColumn, ...rest, ...menu];
  }, [actions, grouped, money.locale, onSort, sort, statusOf]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns functions that are not memoizable
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    enableRowSelection: actions !== null,
    onRowSelectionChange,
    state: { rowSelection },
  });

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const sortField = header.column.id as MenuSortField;
                const isSortable = ["name", "category", "price", "status"].includes(header.column.id);
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      isSortable && sort.field === sortField ? (sort.dir === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={cn(header.column.id === "select" && "w-10", header.column.id === "actions" && "w-12")}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {(() => {
            const rows = table.getRowModel().rows;
            const columnCount = table.getVisibleLeafColumns().length;
            let previousCategory: number | null = null;
            return rows.map((row) => {
              const item = row.original;
              const startsGroup = grouped && item.categoryId !== previousCategory;
              previousCategory = item.categoryId;
              const isCollapsed = grouped && collapsed.has(item.categoryId);
              const groupRows = startsGroup ? rows.filter((r) => r.original.categoryId === item.categoryId) : [];
              const allSelected = groupRows.length > 0 && groupRows.every((r) => r.getIsSelected());
              const someSelected = groupRows.some((r) => r.getIsSelected());
              return (
                <Fragment key={row.id}>
                  {startsGroup ? (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={columnCount} className="py-2">
                        <div className="flex items-center gap-3">
                          {actions ? (
                            <Checkbox
                              checked={allSelected || (someSelected && "indeterminate")}
                              onCheckedChange={(value) => groupRows.forEach((r) => r.toggleSelected(Boolean(value)))}
                              aria-label={`Select all ${item.categoryName} items on this page`}
                            />
                          ) : null}
                          <GroupLabel
                            item={item}
                            onPage={groupRows.length}
                            total={groupTotals[item.categoryId] ?? groupRows.length}
                            expanded={!isCollapsed}
                            onToggle={() => onToggleGroup(item.categoryId)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {isCollapsed ? null : (
                    <TableRow
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={cn(statusOf(item) === "disabled" && "text-muted-foreground")}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  )}
                </Fragment>
              );
            });
          })()}
        </TableBody>
      </Table>
    </div>
  );
}
