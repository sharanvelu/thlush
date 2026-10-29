"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "custom", label: "Custom" },
] as const;

type Range = (typeof RANGES)[number]["value"];

/** Date-range control. It becomes functional when the dashboard data lands in milestone 5. */
export function RangeSelector() {
  const [range, setRange] = useState<Range>("today");

  return (
    <div role="group" aria-label="Date range" className="inline-flex rounded-xl border bg-card p-1 shadow-card">
      {RANGES.map(({ value, label }) => {
        const selected = range === value;
        const unavailable = value === "custom";
        return (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={selected}
            disabled={unavailable}
            title={unavailable ? "Custom ranges arrive with the dashboard data in milestone 5" : undefined}
            onClick={() => setRange(value)}
            className={cn(
              "rounded-lg px-3",
              selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
