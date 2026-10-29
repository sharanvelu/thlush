"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SHORTCUTS: Array<[keys: string, action: string]> = [
  ["/", "Search items or scan a barcode"],
  ["Enter (in search)", "Add the exact SKU match, or the only result"],
  ["Esc (in search)", "Clear the search"],
  ["Ctrl/⌘ + Enter", "Save bill"],
  ["Ctrl/⌘ + Shift + Enter", "Save and print"],
  ["Alt + H", "Hold bill"],
  ["Alt + Backspace", "Clear the bill"],
];

export function ShortcutsHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts" className="hidden size-10 shrink-0 lg:inline-flex">
          <Keyboard className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-medium">Keyboard shortcuts</p>
        <dl className="flex flex-col gap-1.5 text-sm">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="flex items-start justify-between gap-3">
              <dt>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{keys}</kbd>
              </dt>
              <dd className="text-right text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
