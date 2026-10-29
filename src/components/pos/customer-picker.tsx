"use client";

import { Check, ChevronsUpDown, Plus, User, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CustomerChoice } from "@/components/pos/pos-types";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { CustomerSummary } from "@/services/CustomerService";

interface CustomerPickerProps {
  value: CustomerChoice;
  onChange: (value: CustomerChoice) => void;
  walkInLabel: string;
}

/** Pick an existing customer by name or phone, or type a new name (created when the bill is saved). */
export function CustomerPicker({ value, onChange, walkInLabel }: CustomerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CustomerSummary[]>([]);
  const term = useDebouncedValue(search.trim(), 250);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    // Plain fetch (not the api helper) so an in-flight lookup can be cancelled as the user types.
    fetch(`/api/customers?q=${encodeURIComponent(term)}&pageSize=8`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { success: boolean; data: CustomerSummary[] } | null) => {
        if (payload?.success) setResults(payload.data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [open, term]);

  const typed = search.trim();
  const exact = results.some((c) => c.name.toLowerCase() === typed.toLowerCase());
  const label =
    value.kind === "walkin" ? walkInLabel : value.kind === "existing" ? value.name : `${value.name} (new)`;

  const choose = (choice: CustomerChoice) => {
    onChange(choice);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} aria-label="Customer" className="h-9 min-w-0 flex-1 justify-between">
              <span className="flex min-w-0 items-center gap-2">
                {value.kind === "new" ? <UserPlus className="size-4 shrink-0" aria-hidden /> : <User className="size-4 shrink-0" aria-hidden />}
                <span className="truncate">{label}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Search by name or phone, or type a new name" value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>{typed ? "No match. Add them below." : "Start typing to search."}</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="__walkin" onSelect={() => choose({ kind: "walkin" })}>
                    <User aria-hidden /> {walkInLabel}
                    {value.kind === "walkin" ? <Check className="ml-auto" aria-hidden /> : null}
                  </CommandItem>
                  {results.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`c-${c.id}`}
                      onSelect={() => choose({ kind: "existing", id: c.id, name: c.name, phone: c.phone, email: c.email })}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {c.phone ? <span className="text-xs text-muted-foreground">{c.phone}</span> : null}
                      {value.kind === "existing" && value.id === c.id ? <Check aria-hidden /> : null}
                    </CommandItem>
                  ))}
                  {typed && !exact ? (
                    <CommandItem value="__new" onSelect={() => choose({ kind: "new", name: typed, phone: "" })}>
                      <Plus aria-hidden /> Add &quot;{typed}&quot; as a new customer
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value.kind !== "walkin" ? (
          <Button variant="ghost" size="icon" className="size-9" onClick={() => onChange({ kind: "walkin" })} aria-label="Remove customer">
            <X aria-hidden />
          </Button>
        ) : null}
      </div>

      {value.kind === "new" ? (
        <Input
          type="tel"
          inputMode="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="Phone (optional)"
          aria-label="New customer's phone number"
          maxLength={20}
          className="h-9"
        />
      ) : null}
    </div>
  );
}
