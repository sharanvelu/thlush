"use client";

import { ChevronDown, Search, SearchX, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { ItemThumb, VegMark } from "@/components/menu/menu-primitives";
import { Input } from "@/components/ui/input";
import type { CustomerMenuItem, CustomerMenuSection } from "@/lib/customer-menu";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface CustomerMenuProps {
  sections: CustomerMenuSection[];
  currency: string;
  locale: string;
}

const matches = (item: CustomerMenuItem, needle: string) =>
  [item.name, ...item.variants.map((v) => v.name), ...item.addons.map((a) => a.name)].some((text) =>
    text.toLowerCase().includes(needle),
  );

/** The menu as an accordion of categories, with a search that only filters what is already on the page. */
export function CustomerMenu({ sections, currency, locale }: CustomerMenuProps) {
  const baseId = useId();
  const [query, setQuery] = useState("");
  // The first category starts open; the rest are closed until tapped.
  const [open, setOpen] = useState<Set<number>>(() => new Set(sections[0] ? [sections[0].id] : []));
  const money = (value: string) => formatMoney(value, { currency, locale });

  const needle = query.trim().toLowerCase();
  const searching = needle !== "";

  const visible = useMemo(() => {
    if (!needle) return sections;
    return sections.flatMap((section) => {
      // Searching for a category name shows all of its items.
      const items = section.name.toLowerCase().includes(needle) ? section.items : section.items.filter((i) => matches(i, needle));
      return items.length > 0 ? [{ ...section, items }] : [];
    });
  }, [sections, needle]);

  const toggle = (id: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 -mx-4 bg-background/75 px-4 py-3 backdrop-blur-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-primary" aria-hidden />
          <label htmlFor={`${baseId}-search`} className="sr-only">
            Search the menu
          </label>
          <Input
            id={`${baseId}-search`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, sizes, extras"
            autoComplete="off"
            className="h-12 rounded-full border-border bg-card/70 pr-11 pl-11 text-base shadow-lg shadow-black/10 placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-primary/30 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {searching ? `${visible.reduce((n, s) => n + s.items.length, 0)} items found` : ""}
      </p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <SearchX className="size-6" aria-hidden />
          </span>
          <p className="text-sm">Nothing on the menu matches &ldquo;{query.trim()}&rdquo;.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {visible.map((section) => {
            // While searching, every matching category is open so the results are all visible.
            const expanded = searching || open.has(section.id);
            const panelId = `${baseId}-panel-${section.id}`;
            return (
              <section
                key={section.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card/80 shadow-lg shadow-black/10 transition-colors motion-reduce:transition-none",
                  expanded && "border-primary/30 bg-card",
                )}
              >
                <h2>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => toggle(section.id)}
                    disabled={searching}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/40 disabled:cursor-default disabled:hover:bg-transparent motion-reduce:transition-none"
                  >
                    <span aria-hidden className={cn("h-6 w-1 shrink-0 rounded-full transition-colors motion-reduce:transition-none", expanded ? "bg-primary" : "bg-border")} />
                    <span className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{section.name}</span>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary tabular-nums">
                      {section.items.length}
                    </span>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all motion-reduce:transition-none",
                        expanded && "bg-primary text-primary-foreground",
                        searching && "opacity-0",
                      )}
                    >
                      <ChevronDown className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden />
                    </span>
                  </button>
                </h2>
                <div
                  id={panelId}
                  role="region"
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                  inert={!expanded}
                >
                  <ul className="min-h-0 divide-y divide-border/60 overflow-hidden border-t border-border/60">
                    {section.items.map((item) => (
                      <li key={item.id} className="flex gap-3.5 p-4 transition-colors hover:bg-accent/30 motion-reduce:transition-none">
                        <ItemThumb src={item.imageSrc} name={item.name} className="size-[4.5rem] rounded-xl bg-muted ring-1 ring-border" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="flex items-center gap-2 text-base leading-snug font-medium">
                              <VegMark isVeg={item.isVeg} />
                              <span>{item.name}</span>
                            </p>
                            {item.variants.length === 0 ? (
                              <p className="shrink-0 text-base font-semibold text-primary tabular-nums">
                                {money(item.price)}
                                {item.unit !== "pcs" ? <span className="text-xs font-normal text-muted-foreground"> / {item.unit}</span> : null}
                              </p>
                            ) : null}
                          </div>
                          {item.variants.length > 0 ? (
                            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                              {item.variants.map((v) => (
                                <li key={v.name} className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 py-1 pr-3 pl-3">
                                  <span className="text-muted-foreground">{v.name}</span>
                                  <span className="font-semibold text-primary tabular-nums">{money(v.price)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {item.addons.length > 0 ? (
                            <ul aria-label="Extras" className="mt-2 flex flex-wrap gap-1.5 text-xs">
                              {item.addons.map((a) => (
                                <li key={a.name} className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                                  + {a.name} <span className="font-medium text-foreground tabular-nums">{money(a.price)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
