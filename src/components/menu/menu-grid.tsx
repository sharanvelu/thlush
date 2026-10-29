"use client";

import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { GroupLabel } from "@/components/menu/menu-group";
import { ItemThumb, VegMark, taxLabel } from "@/components/menu/menu-primitives";
import type { MenuItemActions, MoneyFormat } from "@/components/menu/menu-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MenuListItem } from "@/services/MenuService";

interface MenuGridProps {
  items: MenuListItem[];
  money: MoneyFormat;
  statusOf: (item: MenuListItem) => "active" | "disabled";
  actions: MenuItemActions | null;
  /** Show a section per category instead of one flat grid. */
  grouped: boolean;
  /** Items per category across all pages, for the section headings. */
  groupTotals: Record<number, number>;
  /** Category ids whose items are hidden (accordion closed). */
  collapsed: ReadonlySet<number>;
  onToggleGroup: (categoryId: number) => void;
}

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

export function MenuGrid({ items, money, statusOf, actions, grouped, groupTotals, collapsed, onToggleGroup }: MenuGridProps) {
  if (!grouped) return <ItemCards items={items} money={money} statusOf={statusOf} actions={actions} />;

  // Items arrive ordered by category, so consecutive runs form the sections.
  const sections: Array<{ categoryId: number; items: MenuListItem[] }> = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.categoryId === item.categoryId) last.items.push(item);
    else sections.push({ categoryId: item.categoryId, items: [item] });
  }

  return (
    <div className="flex flex-col gap-3">
      {sections.map(({ categoryId, items: sectionItems }) => {
        const first = sectionItems[0];
        if (!first) return null;
        const headingId = `menu-group-${categoryId}`;
        const panelId = `menu-group-panel-${categoryId}`;
        const expanded = !collapsed.has(categoryId);
        return (
          <section key={categoryId} aria-labelledby={headingId} className="rounded-xl border bg-card/50 px-3 py-1">
            <GroupLabel
              item={first}
              onPage={sectionItems.length}
              total={groupTotals[categoryId] ?? sectionItems.length}
              headingId={headingId}
              expanded={expanded}
              onToggle={() => onToggleGroup(categoryId)}
              controlsId={panelId}
            />
            <div id={panelId} hidden={!expanded} className="pt-2 pb-3">
              {expanded ? <ItemCards items={sectionItems} money={money} statusOf={statusOf} actions={actions} /> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ItemCards({ items, money, statusOf, actions }: Pick<MenuGridProps, "items" | "money" | "statusOf" | "actions">) {
  return (
    <ul className={GRID}>
      {items.map((item) => {
        const active = statusOf(item) === "active";
        const tax = taxLabel(item.sgst, item.cgst);
        return (
          <li
            key={item.id}
            className={cn("flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-card", !active && "opacity-70")}
          >
            <div className="flex items-start gap-3">
              <ItemThumb src={item.imageSrc} name={item.name} className="size-16" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <VegMark isVeg={item.isVeg} />
                  <h3 className="truncate font-medium">{item.name}</h3>
                </div>
                <p className="truncate text-xs text-muted-foreground">{item.categoryName}</p>
                <p className="mt-1 text-base font-semibold tabular-nums">
                  {formatMoney(item.price, { currency: item.currency, locale: money.locale })}
                </p>
              </div>
              {actions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`}>
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => actions.onEdit(item)}>
                      <Pencil aria-hidden /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => actions.onDuplicate(item)}>
                      <Copy aria-hidden /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(item)}>
                      <Trash2 aria-hidden /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span title={tax.detail}>Tax {tax.total}</span>
              {item.sku ? <span className="truncate font-mono">{item.sku}</span> : null}
              {actions ? (
                <Switch
                  checked={active}
                  onCheckedChange={(checked) => actions.onToggleStatus(item, checked)}
                  aria-label={`${item.name} is ${active ? "available" : "disabled"}`}
                />
              ) : (
                <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Disabled"}</Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
