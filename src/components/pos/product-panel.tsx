"use client";

import { ChevronsDownUp, ChevronsUpDown, LayoutGrid, List, Minus, Plus, Search, SearchX, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/categories/category-icon";
import { EmptyState } from "@/components/layout/empty-state";
import { GroupLabel } from "@/components/menu/menu-group";
import { ItemThumb, VegMark } from "@/components/menu/menu-primitives";
import { quantityInCart, type CartLine, type PosItem } from "@/components/pos/pos-cart";
import { ShortcutsHelp } from "@/components/pos/shortcuts-help";
import type { PosSettings } from "@/components/pos/pos-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCollapsedGroups } from "@/hooks/use-collapsed-groups";
import { D, formatMoney, type Dec } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface PosCategory {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
}

interface Availability {
  /** Cannot be added right now. */
  blocked: boolean;
  label: string | null;
}

function availability(item: PosItem, inCart: Dec, blockOutOfStock: boolean): Availability {
  if (item.status !== "active") return { blocked: true, label: "Unavailable" };
  if (!item.trackStock) return { blocked: false, label: null };
  const stock = new D(item.stockQty);
  if (stock.lessThanOrEqualTo(0)) return { blocked: blockOutOfStock, label: "Out of stock" };
  if (blockOutOfStock && inCart.greaterThanOrEqualTo(stock)) return { blocked: true, label: "All in bill" };
  return { blocked: false, label: stock.lessThanOrEqualTo(5) ? `${stock.toString()} left` : null };
}

interface ProductPanelProps {
  items: PosItem[];
  categories: PosCategory[];
  lines: CartLine[];
  settings: PosSettings;
  searchRef: RefObject<HTMLInputElement | null>;
  onPick: (item: PosItem) => void;
  /** Takes one unit of the item off the bill (the most recently added line of it). */
  onDecrement: (item: PosItem) => void;
}

const STORAGE_KEY = "thlush.pos.collapsed-groups";

export function ProductPanel({ items, categories, lines, settings, searchRef, onPick, onDecrement }: ProductPanelProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const accordion = useCollapsedGroups(STORAGE_KEY);

  const term = query.trim().toLowerCase();

  const visible = useMemo(() => {
    return items.filter((item) => {
      // Searching looks across every category; the chips only narrow the unsearched list.
      if (term) {
        return (
          item.name.toLowerCase().includes(term) ||
          item.categoryName.toLowerCase().includes(term) ||
          (item.sku?.toLowerCase().includes(term) ?? false)
        );
      }
      return categoryId === null || item.categoryId === categoryId;
    });
  }, [items, term, categoryId]);

  // Items under their category, in the same order as the chips (and so the menu).
  const groups = useMemo(
    () =>
      categories
        .map((category) => ({ category, items: visible.filter((i) => i.categoryId === category.id) }))
        .filter((g) => g.items.length > 0),
    [categories, visible],
  );

  // Groups stay open while searching or when one category is chosen, so nothing is hidden by accident.
  const alwaysOpen = term !== "" || categoryId !== null;
  const collapsed = alwaysOpen ? new Set<number>() : accordion.collapsed;
  const canCollapseAll = !alwaysOpen && groups.length > 1;
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.category.id));

  const pick = (item: PosItem) => {
    const state = availability(item, quantityInCart(lines, item.id), settings.blockOutOfStock);
    if (state.blocked) {
      toast.error(`"${item.name}" ${state.label ? `is ${state.label.toLowerCase()}` : "cannot be added"}.`);
      return;
    }
    onPick(item);
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setQuery("");
      event.currentTarget.blur();
      return;
    }
    if (event.key !== "Enter" || !term) return;
    event.preventDefault();
    // A scanner types the SKU and presses Enter: an exact SKU match goes straight into the bill.
    const exact = items.find((i) => i.sku?.toLowerCase() === term);
    const target = exact ?? (visible.length === 1 ? visible[0] : undefined);
    if (target) {
      pick(target);
      setQuery("");
    } else {
      toast.error(visible.length === 0 ? `Nothing matches "${query.trim()}".` : "Several items match. Tap the one you want.");
    }
  };

  const money = (value: string) => formatMoney(value, { currency: settings.currency, locale: settings.locale });

  const renderItem = (item: PosItem) => {
    const inCart = quantityInCart(lines, item.id);
    const state = availability(item, inCart, settings.blockOutOfStock);
    const props = { item, inCart, state, price: money(item.price), onAdd: () => pick(item), onRemove: () => onDecrement(item) };
    return <li key={item.id}>{view === "grid" ? <ItemCard {...props} /> : <ItemRow {...props} />}</li>;
  };

  // Columns follow the width of this panel: three whenever they fit comfortably, two when narrow.
  const listClass =
    view === "grid"
      ? "grid grid-cols-1 gap-3 @min-[18rem]/panel:grid-cols-2 @min-[28rem]/panel:grid-cols-3"
      : "flex flex-col gap-2";

  return (
    <section aria-label="Menu items" className="@container/panel flex min-h-0 flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search items, categories or scan a barcode"
            aria-label="Search items, categories or scan a barcode"
            aria-keyshortcuts="/"
            autoComplete="off"
            className="h-10 pr-9 pl-9 text-base"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
        {canCollapseAll ? (
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            onClick={() => accordion.setAll(groups.map((g) => g.category.id), !allCollapsed)}
            aria-label={allCollapsed ? "Expand all categories" : "Collapse all categories"}
            title={allCollapsed ? "Expand all" : "Collapse all"}
          >
            {allCollapsed ? <ChevronsUpDown aria-hidden /> : <ChevronsDownUp aria-hidden />}
          </Button>
        ) : null}
        <ShortcutsHelp />
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(v) => v && setView(v as "grid" | "list")}
          aria-label="Choose layout"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view" className="size-10">
            <LayoutGrid aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="size-10">
            <List aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 py-1", term && "opacity-50")} role="group" aria-label="Categories">
        <CategoryChip selected={categoryId === null} onClick={() => setCategoryId(null)}>
          All
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
            <CategoryBadge icon={c.icon} color={c.color} className="size-5 rounded" />
            {c.name}
          </CategoryChip>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-0.5 pt-1 pb-4" aria-live="polite">
        {groups.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={term ? "No items match" : "No items in this category"}
            description={term ? "Try another name, category or barcode." : "Pick another category above."}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map(({ category, items: groupItems }) => {
              const expanded = !collapsed.has(category.id);
              const headingId = `pos-group-${category.id}`;
              const panelId = `pos-group-panel-${category.id}`;
              return (
                <section key={category.id} aria-labelledby={headingId} className="rounded-xl border bg-card/40 px-3 py-1">
                  <GroupLabel
                    item={{ categoryName: category.name, categoryColor: category.color, categoryIcon: category.icon, categoryStatus: "active" }}
                    onPage={groupItems.length}
                    total={groupItems.length}
                    headingId={headingId}
                    expanded={expanded}
                    onToggle={() => accordion.toggle(category.id)}
                    controlsId={panelId}
                  />
                  <div id={panelId} hidden={!expanded} className="pt-2 pb-3">
                    {expanded ? <ul className={listClass}>{groupItems.map(renderItem)}</ul> : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

interface ItemViewProps {
  item: PosItem;
  inCart: Dec;
  state: Availability;
  price: string;
  onAdd: () => void;
  onRemove: () => void;
}

/**
 * Minus, count and plus. The minus and count only appear once the item is on the bill.
 * Sits above the card's own "add" surface so each button can be pressed on its own.
 */
function Stepper({ item, inCart, state, onAdd, onRemove }: Pick<ItemViewProps, "item" | "inCart" | "state" | "onAdd" | "onRemove">) {
  const onBill = inCart.greaterThan(0);
  return (
    <span className="relative z-10 flex shrink-0 items-center gap-1">
      {onBill ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7 rounded-full"
            onClick={onRemove}
            aria-label={`Take one ${item.name} off the bill`}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <span className="min-w-5 text-center text-sm font-semibold tabular-nums" aria-label={`${inCart.toString()} of ${item.name} on the bill`}>
            {inCart.toString()}
          </span>
        </>
      ) : null}
      <Button
        type="button"
        size="icon"
        className={cn("size-7 rounded-full", state.blocked && "opacity-50")}
        onClick={onAdd}
        aria-disabled={state.blocked}
        aria-label={`Put one ${item.name} on the bill`}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </span>
  );
}

function ItemCard(props: ItemViewProps) {
  const { item, inCart, state, price, onAdd } = props;
  const onBill = inCart.greaterThan(0);
  const dim = state.blocked && !onBill;
  return (
    <div
      className={cn(
        "relative flex h-full min-h-32 flex-col justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-card transition",
        "hover:border-primary/50 has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring motion-reduce:transition-none",
        onBill && "border-primary/60 bg-accent/30",
        dim && "opacity-50 hover:border-border",
      )}
    >
      <button
        type="button"
        onClick={onAdd}
        aria-disabled={state.blocked}
        aria-label={`Add ${item.name}, ${price}${state.label ? `, ${state.label}` : ""}`}
        className="flex items-start gap-3 text-left outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
      >
        {item.imageSrc ? <ItemThumb src={item.imageSrc} name={item.name} className="size-12" /> : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <VegMark isVeg={item.isVeg} className="mt-0.5" />
            <span className="line-clamp-2 text-sm leading-snug font-medium">{item.name}</span>
          </span>
          <Notes item={item} state={state} />
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <span className="text-base font-semibold tabular-nums">{price}</span>
        <Stepper {...props} />
      </div>
    </div>
  );
}

function ItemRow(props: ItemViewProps) {
  const { item, inCart, state, price, onAdd } = props;
  const onBill = inCart.greaterThan(0);
  const dim = state.blocked && !onBill;
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/50",
        "has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring",
        onBill && "border-primary/60 bg-accent/30",
        dim && "opacity-50 hover:border-border",
      )}
    >
      <button
        type="button"
        onClick={onAdd}
        aria-disabled={state.blocked}
        aria-label={`Add ${item.name}, ${price}${state.label ? `, ${state.label}` : ""}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
      >
        <VegMark isVeg={item.isVeg} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {item.categoryName}
            {item.sku ? ` · ${item.sku}` : ""}
          </span>
        </span>
        {state.label ? <Badge variant="secondary">{state.label}</Badge> : null}
        <span className="text-sm font-semibold tabular-nums">{price}</span>
      </button>
      <Stepper {...props} />
    </div>
  );
}

function Notes({ item, state }: { item: PosItem; state: Availability }) {
  const hasOptions = item.variants.length > 0 || item.addons.length > 0;
  if (!state.label && !hasOptions) return null;
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      {state.label ? <Badge variant="secondary">{state.label}</Badge> : null}
      {hasOptions ? <span className="text-xs text-muted-foreground">Sizes &amp; extras</span> : null}
    </span>
  );
}

function CategoryChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
