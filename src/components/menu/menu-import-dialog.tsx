"use client";

import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api-client";
import { toCsv } from "@/lib/csv";
import type { ImportResult } from "@/services/MenuService";

interface MenuImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const TEMPLATE = toCsv([
  ["Name", "Category", "Price", "SGST %", "CGST %", "Currency", "Status", "SKU", "Type", "Description"],
  ["Masala Dosa", "South Indian", "90", "2.5", "2.5", "INR", "active", "SIN-001", "Veg", "Crisp dosa with potato filling"],
  ["Chicken Biryani", "North Indian", "260", "2.5", "2.5", "INR", "active", "NIN-004", "Non-veg", ""],
]);

function downloadTemplate() {
  const blob = new Blob([`﻿${TEMPLATE}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "menu-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function MenuImportDialog({ open, onOpenChange, onImported }: MenuImportDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);

  const reset = () => {
    setFileName(null);
    setCsv(null);
    setPreview(null);
    setBusy(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setPreview(null);
    setFileName(file.name);
    setBusy("preview");
    try {
      const text = await file.text();
      setCsv(text);
      const response = await api.post<ImportResult>("/api/menu/import", { csv: text, dryRun: true });
      setPreview(response.data);
    } catch (error) {
      setCsv(null);
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    if (!csv) return;
    setBusy("import");
    try {
      const response = await api.post<ImportResult>("/api/menu/import", { csv, dryRun: false });
      const { created, updated } = response.data;
      toast.success(`Imported: ${created} added, ${updated} updated`);
      onImported();
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(null);
    }
  };

  const hasErrors = (preview?.errors.length ?? 0) > 0;
  const workToDo = (preview?.created ?? 0) + (preview?.updated ?? 0);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import menu from CSV</DialogTitle>
          <DialogDescription>
            Items with a matching SKU (or the same name in the same category) are updated. Everything else is added.
            Nothing is saved until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              id="menu-import-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => void chooseFile(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden /> {fileName ? "Choose another file" : "Choose CSV file"}
            </Button>
            <Button type="button" variant="ghost" onClick={downloadTemplate}>
              <Download aria-hidden /> Download template
            </Button>
          </div>

          {fileName ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4" aria-hidden /> <span className="truncate">{fileName}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Required columns: Name, Category, Price. Optional: SGST %, CGST %, Currency, Status, SKU, Type, Description.
              Missing categories are created for you.
            </p>
          )}

          {busy === "preview" ? (
            <p role="status" className="flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" aria-hidden /> Checking the file...
            </p>
          ) : null}

          {preview ? (
            <div role="status" className="rounded-xl border p-3 text-sm">
              {hasErrors ? (
                <>
                  <p className="flex items-center gap-2 font-medium text-destructive">
                    <AlertTriangle className="size-4" aria-hidden /> Fix these rows and choose the file again
                  </p>
                  <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
                    {preview.errors.map((e) => (
                      <li key={`${e.row}-${e.message}`}>
                        <span className="font-medium">Row {e.row}:</span> {e.message}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-medium text-success">
                    <CheckCircle2 className="size-4" aria-hidden /> Ready to import
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>{preview.created} new {preview.created === 1 ? "item" : "items"}</li>
                    <li>{preview.updated} {preview.updated === 1 ? "item" : "items"} updated</li>
                    {preview.newCategories.length > 0 ? (
                      <li>New categories: {preview.newCategories.join(", ")}</li>
                    ) : null}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy !== null}>
            Cancel
          </Button>
          <Button type="button" onClick={runImport} disabled={!preview || hasErrors || workToDo === 0 || busy !== null}>
            {busy === "import" ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            Import {workToDo > 0 ? `${workToDo} ${workToDo === 1 ? "item" : "items"}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
