"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ResolvedRange } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

/** Date-range control. The choice lives in the URL, so a view can be bookmarked or shared. */
export function RangeSelector({ range, today }: { range: ResolvedRange; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(range.key === "custom");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const go = (values: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end" aria-busy={pending}>
      <div role="group" aria-label="Date range" className="inline-flex rounded-xl border bg-card p-1 shadow-card">
        {PRESETS.map(({ value, label }) => {
          const selected = range.key === value && !customOpen;
          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={selected}
              onClick={() => {
                setCustomOpen(false);
                go({ range: value === "today" ? null : value, from: null, to: null });
              }}
              className={cn("rounded-lg px-3", selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
            >
              {label}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={customOpen}
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((open) => !open)}
          className={cn("rounded-lg px-3", customOpen && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
        >
          Custom
        </Button>
      </div>

      {customOpen ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) go({ range: "custom", from, to });
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            From
            <Input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className="h-8 w-40" required />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            To
            <Input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className="h-8 w-40" required />
          </label>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      ) : null}
    </div>
  );
}
