"use client";

import { Check, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CustomerChoice } from "@/components/pos/pos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { CustomerSummary } from "@/services/CustomerService";

interface CustomerPickerProps {
  value: CustomerChoice;
  onChange: (value: CustomerChoice) => void;
  walkInLabel: string;
}

const digitsOf = (text: string | null) => (text ?? "").replace(/\D/g, "");

/** Plain fetch (not the api helper) so an in-flight lookup can be cancelled as the user types. */
async function lookup(q: string, signal: AbortSignal): Promise<CustomerSummary[]> {
  const response = await fetch(`/api/customers?q=${encodeURIComponent(q)}&pageSize=6`, { signal });
  if (!response.ok) return [];
  const payload = (await response.json()) as { success: boolean; data: CustomerSummary[] };
  return payload.success ? payload.data : [];
}

/**
 * Customer on a bill, as two plain fields: phone, then name. Both empty is a walk-in. Typing a phone number
 * that belongs to a saved customer fills in their name; typing a name lists saved customers to pick from.
 * Anything else is a new customer, created when the bill is saved.
 */
export function CustomerPicker({ value, onChange, walkInLabel }: CustomerPickerProps) {
  const phone = value.kind === "walkin" ? "" : (value.phone ?? "");
  const name = value.kind === "walkin" ? "" : value.name;
  const existing = value.kind === "existing" ? value : null;

  const baseId = useId();
  const [nameFocused, setNameFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ term: string; rows: CustomerSummary[] }>({ term: "", rows: [] });
  const [phoneMatch, setPhoneMatch] = useState<{ digits: string; customer: CustomerSummary | null }>({
    digits: "",
    customer: null,
  });
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  const nameTerm = useDebouncedValue(name.trim(), 250);
  const phoneDigits = digitsOf(phone);
  const phoneTerm = useDebouncedValue(phoneDigits, 300);

  // Saved customers whose name matches what is being typed.
  useEffect(() => {
    if (!nameFocused || existing || !nameTerm) return;
    const controller = new AbortController();
    lookup(nameTerm, controller.signal)
      .then((rows) => setSuggestions({ term: nameTerm, rows }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [nameFocused, existing, nameTerm]);

  // A complete phone number that belongs to a saved customer.
  useEffect(() => {
    if (existing || phoneTerm.length < 7) return;
    const controller = new AbortController();
    lookup(phoneTerm, controller.signal)
      .then((rows) =>
        setPhoneMatch({ digits: phoneTerm, customer: rows.find((c) => digitsOf(c.phone) === phoneTerm) ?? null }),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [existing, phoneTerm]);

  const match = !existing && phoneMatch.digits === phoneDigits ? phoneMatch.customer : null;

  // Prefill the name from the saved customer, but never overwrite a name that was already typed.
  useEffect(() => {
    if (match && value.kind === "new" && value.name.trim() === "") {
      onChange({ kind: "existing", id: match.id, name: match.name, phone: match.phone, email: match.email });
    }
  }, [match, value, onChange]);

  const edit = (patch: { name?: string; phone?: string }) => {
    const next = { name: patch.name ?? name, phone: patch.phone ?? phone };
    // Changing a saved customer's details starts a new customer from what is on screen.
    onChange(next.name.trim() === "" && next.phone.trim() === "" ? { kind: "walkin" } : { kind: "new", ...next });
  };

  const choose = (customer: CustomerSummary) => {
    onChange({ kind: "existing", id: customer.id, name: customer.name, phone: customer.phone, email: customer.email });
    setNameFocused(false);
  };

  const options = nameFocused && !existing && nameTerm && suggestions.term === nameTerm ? suggestions.rows : [];
  const open = options.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-1.5">
        <div className="grid min-w-0 flex-1 grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
          <label htmlFor={`${baseId}-phone`} className="text-xs font-medium text-muted-foreground">
            Phone
          </label>
          <Input
            id={`${baseId}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            onChange={(e) => edit({ phone: e.target.value })}
            placeholder="Phone number"
            maxLength={20}
            className="h-9"
          />
          <label htmlFor={`${baseId}-name`} className="text-xs font-medium text-muted-foreground">
            Name
          </label>
          <div className="relative min-w-0">
            <Input
              id={`${baseId}-name`}
              role="combobox"
              aria-expanded={open}
              aria-controls="customer-suggestions"
              aria-autocomplete="list"
              autoComplete="off"
              value={name}
              onChange={(e) => {
                setActive(0);
                edit({ name: e.target.value });
              }}
              onFocus={() => {
                window.clearTimeout(blurTimer.current);
                setNameFocused(true);
              }}
              // Delay closing so a click on a suggestion lands before the list disappears.
              onBlur={() => {
                blurTimer.current = window.setTimeout(() => setNameFocused(false), 150);
              }}
              onKeyDown={(e) => {
                if (!open) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, options.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const picked = options[active];
                  if (picked) choose(picked);
                } else if (e.key === "Escape") {
                  setNameFocused(false);
                }
              }}
              placeholder={phone.trim() ? "Customer name" : walkInLabel}
              maxLength={120}
              className="h-9"
            />
            {open ? (
              <ul
                id="customer-suggestions"
                role="listbox"
                aria-label="Matching customers"
                className="absolute inset-x-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-lg bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
              >
                {options.map((customer, index) => (
                  <li
                    key={customer.id}
                    role="option"
                    aria-selected={index === active}
                    // mousedown, not click: it fires before the name field loses focus.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(customer);
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5",
                      index === active && "bg-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{customer.name}</span>
                    {customer.phone ? (
                      <span className="text-xs text-muted-foreground tabular-nums">{customer.phone}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {value.kind !== "walkin" ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => onChange({ kind: "walkin" })}
            aria-label="Remove customer"
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>

      {existing ? (
        <p className="flex items-center gap-1 text-xs text-success">
          <Check className="size-3" aria-hidden /> Saved customer
        </p>
      ) : match &&
        value.kind === "new" &&
        value.name.trim() !== "" &&
        value.name.trim().toLowerCase() !== match.name.toLowerCase() ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          This number belongs to {match.name}.
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => choose(match)}
          >
            Use {match.name}
          </button>
        </p>
      ) : null}
    </div>
  );
}
