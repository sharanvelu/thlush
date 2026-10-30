"use client";

import { Filter, X } from "lucide-react";
import { useState } from "react";
import { STATUS_LABELS } from "@/components/bills/bill-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayIn } from "@/lib/dates";
import { activeFilterCount, BILL_STATUSES, type BillFilters } from "@/lib/validation/bill-history";
import type { UserOption } from "@/services/UserService";
import { PAYMENT_METHOD_LABELS } from "@/types/bill";

type Draft = Omit<BillFilters, "sort">;
const ANY = "any";

interface BillFilterPanelProps {
  filters: BillFilters;
  cashiers: UserOption[] | null;
  timeZone: string;
  onApply: (next: Draft) => void;
  onReset: () => void;
}

/** Collapsible filter panel. Nothing is requested until Apply, so typing never reloads the list. */
export function BillFilterPanel({ filters, cashiers, timeZone, onApply, onReset }: BillFilterPanelProps) {
  const count = activeFilterCount(filters);
  const [open, setOpen] = useState(count > 0);
  const [draft, setDraft] = useState<Draft>(filters);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: "customer" | "item" | "min" | "max" | "from" | "to") => ({
    value: draft[key] ?? "",
    onChange: (e: { target: { value: string } }) => set(key, (e.target.value || undefined) as never),
  });
  const preset = (days: number) => setDraft((d) => ({ ...d, from: todayIn(timeZone, -days), to: todayIn(timeZone) }));

  return (
    <section aria-label="Filters" className="mb-4 rounded-xl border bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="bill-filter-body"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium"
      >
        <Filter className="size-4" aria-hidden /> Filters
        {count > 0 ? (
          <Badge aria-label={`${count} active ${count === 1 ? "filter" : "filters"}`} className="tabular-nums">
            {count}
          </Badge>
        ) : null}
      </button>

      <form
        id="bill-filter-body"
        hidden={!open}
        className="border-t px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          onApply(draft);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="From">
            <Input type="date" {...text("from")} />
          </Field>
          <Field label="To">
            <Input type="date" {...text("to")} />
          </Field>
          <Field label="Customer">
            <Input {...text("customer")} placeholder="Name" maxLength={100} />
          </Field>
          <Field label="Item">
            <Input {...text("item")} placeholder="Item name" maxLength={100} />
          </Field>
          <Field label="Min total">
            <Input inputMode="decimal" {...text("min")} placeholder="0" />
          </Field>
          <Field label="Max total">
            <Input inputMode="decimal" {...text("max")} placeholder="Any" />
          </Field>
          <Field label="Payment">
            <Select value={draft.method ?? ANY} onValueChange={(v) => set("method", v === ANY ? undefined : (v as Draft["method"]))}>
              <SelectTrigger className="w-full" aria-label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any method</SelectItem>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status ?? ANY} onValueChange={(v) => set("status", v === ANY ? undefined : (v as Draft["status"]))}>
              <SelectTrigger className="w-full" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any (not held)</SelectItem>
                {BILL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {cashiers ? (
            <Field label="Cashier">
              <Select value={draft.cashier ?? ANY} onValueChange={(v) => set("cashier", v === ANY ? undefined : v)}>
                <SelectTrigger className="w-full" aria-label="Cashier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Everyone</SelectItem>
                  {cashiers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit">Apply filters</Button>
          <Button type="button" variant="ghost" onClick={onReset} disabled={count === 0 && JSON.stringify(draft) === JSON.stringify(filters)}>
            <X aria-hidden /> Reset
          </Button>
          <span className="ml-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Quick range:
            {[
              ["Today", 0],
              ["Last 7 days", 6],
              ["Last 30 days", 29],
            ].map(([label, days]) => (
              <Button key={label as string} type="button" variant="outline" size="xs" onClick={() => preset(days as number)}>
                {label}
              </Button>
            ))}
          </span>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
