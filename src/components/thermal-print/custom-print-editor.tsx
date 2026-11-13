"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, LoaderCircle, Maximize2, Plus, Printer, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isBlankSection, lineWidth, type CustomAlign, type CustomSection } from "@/lib/escpos-custom";
import { printCustomText } from "@/lib/print";
import type { PaperSize } from "@/types/settings";

interface Field extends CustomSection {
  id: number;
}

const MAX_FIELDS = 20;
const MAX_CHARS = 2000;
const blank = (id: number): Field => ({ id, text: "", align: "left", bold: false, large: false });

/**
 * Free-text printing for the thermal printer. Every text field is its own slip: the printer cuts
 * after each one. Goes through the same print engine as bills (USB, print agent or print dialog).
 */
export function CustomPrintEditor({ paperSize }: { paperSize: PaperSize }) {
  const nextId = useRef(2);
  const [fields, setFields] = useState<Field[]>([blank(1)]);
  const [pending, setPending] = useState(false);

  const update = (id: number, patch: Partial<CustomSection>) =>
    setFields((all) => all.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: number) => setFields((all) => (all.length > 1 ? all.filter((f) => f.id !== id) : all));
  const add = () => setFields((all) => (all.length >= MAX_FIELDS ? all : [...all, blank(nextId.current++)]));

  const slips = fields.filter((f) => !isBlankSection(f)).length;

  const print = async () => {
    if (pending || slips === 0) return;
    setPending(true);
    try {
      const result = await printCustomText(fields, paperSize);
      if (result === "printer") toast.success(slips === 1 ? "Sent to the printer." : `Sent ${slips} slips to the printer.`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <ol className="space-y-4">
        {fields.map((field, index) => {
          const width = lineWidth(paperSize, field.large);
          return (
            <li key={field.id} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Text {index + 1}</h2>
                {fields.length > 1 ? (
                  <Button variant="ghost" size="sm" onClick={() => remove(field.id)} aria-label={`Remove text ${index + 1}`}>
                    <Trash2 aria-hidden /> Remove
                  </Button>
                ) : null}
              </div>

              <Textarea
                aria-label={`Text ${index + 1}`}
                value={field.text}
                onChange={(e) => update(field.id, { text: e.target.value })}
                placeholder="Type what to print…"
                maxLength={MAX_CHARS}
                rows={4}
                className="min-h-24 font-mono"
                // As wide as one printed line, so the text wraps here the way it will on paper.
                style={{ width: `calc(${width}ch + 1.25rem)`, maxWidth: "100%", textAlign: field.align, fontWeight: field.bold ? 700 : undefined }}
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={field.align}
                  onValueChange={(v) => v && update(field.id, { align: v as CustomAlign })}
                  aria-label={`Alignment for text ${index + 1}`}
                >
                  <ToggleGroupItem value="left" aria-label="Align left"><AlignLeft aria-hidden /></ToggleGroupItem>
                  <ToggleGroupItem value="center" aria-label="Align center"><AlignCenter aria-hidden /></ToggleGroupItem>
                  <ToggleGroupItem value="right" aria-label="Align right"><AlignRight aria-hidden /></ToggleGroupItem>
                </ToggleGroup>
                <Toggle variant="outline" size="sm" pressed={field.bold} onPressedChange={(v) => update(field.id, { bold: v })} aria-label="Bold">
                  <Bold aria-hidden />
                </Toggle>
                <Toggle variant="outline" size="sm" pressed={field.large} onPressedChange={(v) => update(field.id, { large: v })} aria-label="Large text">
                  <Maximize2 aria-hidden /> Large
                </Toggle>
                <p className="ml-auto text-xs text-muted-foreground tabular-nums">{width} characters per line</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={add} disabled={fields.length >= MAX_FIELDS}>
          <Plus aria-hidden /> Add text field
        </Button>
        <Button onClick={() => void print()} disabled={pending || slips === 0} className="ml-auto">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Printer aria-hidden />}
          {slips > 1 ? `Print ${slips} slips` : "Print"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Each text field prints as its own slip, and the paper is cut after each one. Empty fields are skipped.</p>
    </div>
  );
}
