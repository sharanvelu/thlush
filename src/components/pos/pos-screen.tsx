"use client";

import { ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CartPanel } from "@/components/pos/cart-panel";
import { HeldBillsPanel } from "@/components/pos/held-bills-panel";
import { OptionDialog } from "@/components/pos/option-dialog";
import {
  cartReducer,
  cartTotals,
  lineKey,
  resolvePayment,
  type CartLine,
  type PaymentState,
  type PosItem,
} from "@/components/pos/pos-cart";
import { EMPTY_DETAILS, type BillDetailsDraft, type PosSettings } from "@/components/pos/pos-types";
import { ProductPanel, type PosCategory } from "@/components/pos/product-panel";
import { SuccessDialog } from "@/components/pos/success-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { normalizeAddons } from "@/lib/addons";
import { clearBillDraft, loadBillDraft, saveBillDraft, toDraftLines } from "@/lib/bill-draft";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { D, formatMoney, toDecimal } from "@/lib/money";
import { printReceipt } from "@/lib/print";
import type { HeldBillSummary, SavedBill } from "@/types/bill";
import type { BillDetail } from "@/types/bill";
import type { AppSettings } from "@/types/settings";

interface PosScreenProps {
  items: PosItem[];
  categories: PosCategory[];
  settings: PosSettings & { timezone: string };
  appSettings: AppSettings;
  initialHeld: HeldBillSummary[];
}

const INITIAL_PAYMENT: PaymentState = { split: false, method: "upi", received: "", reference: "", rows: [] };
const MONEY_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;

/** A fresh id per save attempt. `randomUUID` needs HTTPS, so fall back for tablets on a plain LAN address. */
function newRef(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable));
}

export function PosScreen({ items, categories, settings, appSettings, initialHeld }: PosScreenProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const attempt = useRef({ signature: "", ref: "" });

  const [lines, dispatch] = useReducer(cartReducer, [] as CartLine[]);
  const [details, setDetails] = useState<BillDetailsDraft>(EMPTY_DETAILS);
  const [payment, setPayment] = useState<PaymentState>(INITIAL_PAYMENT);
  const [heldBillId, setHeldBillId] = useState<number | null>(null);
  const [held, setHeld] = useState(initialHeld);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<SavedBill | null>(null);

  const [optionItem, setOptionItem] = useState<PosItem | null>(null);
  const [editLine, setEditLine] = useState<CartLine | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [resumeId, setResumeId] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  // ---- Derived totals ---------------------------------------------------------
  const billDiscount = useMemo(() => {
    const value = details.discountValue.trim();
    if (!settings.discountsEnabled || value === "" || toDecimal(value).lessThanOrEqualTo(0)) return null;
    return { type: details.discountKind, value };
  }, [details.discountKind, details.discountValue, settings.discountsEnabled]);

  const totals = useMemo(
    () =>
      cartTotals(lines, {
        ignoreTax: settings.ignoreTax,
        billDiscount,
        packaging: { orderType: settings.orderTypesEnabled ? details.orderType : null, settings: settings.packaging },
      }),
    [lines, settings.ignoreTax, settings.orderTypesEnabled, settings.packaging, details.orderType, billDiscount],
  );
  const paymentResult = useMemo(() => resolvePayment(payment, totals.grandTotal), [payment, totals.grandTotal]);

  const problem = useMemo(() => {
    const value = details.discountValue.trim();
    if (details.customer.kind === "new" && details.customer.name.trim() === "") return "Enter the new customer's name.";
    if (value !== "" && !MONEY_PATTERN.test(value)) return "The bill discount must be a number like 10 or 10.50.";
    if (lines.some((l) => l.discount.trim() !== "" && !MONEY_PATTERN.test(l.discount.trim()))) {
      return "A line discount must be a number like 10 or 10.50.";
    }
    return null;
  }, [details.discountValue, details.customer, lines]);

  // ---- Actions ----------------------------------------------------------------
  const resetBill = useCallback(() => {
    dispatch({ type: "clear" });
    setDetails(EMPTY_DETAILS);
    setPayment(INITIAL_PAYMENT);
    setHeldBillId(null);
    attempt.current = { signature: "", ref: "" };
    setCartOpen(false);
  }, []);

  const refreshHeld = useCallback(async () => {
    try {
      const { data } = await api.get<HeldBillSummary[]>("/api/bills/held");
      setHeld(data);
    } catch {
      // The list is a convenience; the next hold or reload brings it back in step.
    }
  }, []);

  const pick = useCallback((item: PosItem) => {
    if (item.variants.length > 0 || item.addons.length > 0) setOptionItem(item);
    else dispatch({ type: "add", item });
  }, []);

  /** The minus on an item card: one unit off the most recently added line of that item. */
  const decrement = useCallback(
    (item: PosItem) => {
      const line = [...lines].reverse().find((l) => l.item.id === item.id);
      if (line) dispatch({ type: "step", key: line.key, direction: -1 });
    },
    [lines],
  );

  const submit = useCallback(
    async (action: "complete" | "hold" | "kot") => {
      if (pending || lines.length === 0) return;
      if (problem) return void toast.error(problem);
      if (action === "complete" && !paymentResult.valid) {
        return void toast.error(paymentResult.message ?? "Collect the full amount first.");
      }

      const c = details.customer;
      const body = {
        action,
        heldBillId,
        customer:
          c.kind === "walkin" ? null : c.kind === "existing" ? { id: c.id } : { name: c.name, phone: c.phone.trim() || null },
        lines: lines.map((l) => ({
          menuItemId: l.item.id,
          quantity: l.quantity,
          discount: l.discount.trim() || "0",
          variant: l.variant,
          addons: l.addons,
        })),
        discount: billDiscount,
        orderType: settings.orderTypesEnabled ? details.orderType : null,
        tableNo: details.orderType === "dine_in" ? details.tableNo.trim() || null : null,
        notes: details.notes.trim() || null,
        payments: action === "complete" ? paymentResult.payments : [],
        sendRemainder: action === "complete" && appSettings.receipt.printKitchenByDefault,
        cashTendered: action === "complete" ? paymentResult.cashTendered : null,
      };

      // Pressing Save twice, or retrying after a dropped connection, reuses the same reference,
      // so the server hands back the first bill instead of making a second. Any edit gets a new one.
      const signature = JSON.stringify(body);
      if (attempt.current.signature !== signature) attempt.current = { signature, ref: newRef() };

      setPending(true);
      try {
        const response = await api.post<SavedBill>("/api/bills", { ...body, clientRef: attempt.current.ref });
        const bill = response.data;
        if (action === "kot") {
          toast.success(`Sent to the kitchen (KOT #${bill.newKotSeq ?? bill.kots.length}). The order stays open under Held bills.`);
          if (bill.newKotSeq !== null) void printReceipt(bill.id, { kot: bill.newKotSeq, receipt: false });
          void refreshHeld();
          resetBill();
        } else if (action === "hold") {
          toast.success(heldBillId ? "Held bill updated" : "Bill held. Resume it from Held bills.");
          void refreshHeld();
          resetBill();
        } else {
          if (heldBillId) setHeld((list) => list.filter((b) => b.id !== heldBillId));
          resetBill();
          setSaved(bill);
          void printReceipt(bill.id, { kot: bill.newKotSeq ?? undefined });
        }
        router.refresh(); // Stock levels on the item cards.
      } catch (error) {
        toast.error(errorMessage(error));
        // Something changed under us (an item was disabled, stock ran out): reload the catalogue.
        if (error instanceof ApiClientError && error.status === 409) router.refresh();
      } finally {
        setPending(false);
      }
    },
    [pending, lines, problem, paymentResult, details, heldBillId, billDiscount, settings.orderTypesEnabled, resetBill, refreshHeld, router, appSettings.receipt.printKitchenByDefault],
  );

  const resume = useCallback(
    async (id: number, confirmed = false) => {
      if (lines.length > 0 && !confirmed) return void setResumeId(id);
      setResumeId(null);
      try {
        const { data: bill } = await api.get<BillDetail>(`/api/bills/${id}`);
        const restored: CartLine[] = [];
        const skipped: string[] = [];
        for (const row of bill.items) {
          if (row.isPackaging) continue; // Added again from the settings when the bill is saved.
          const item = items.find((i) => i.id === row.menuItemId);
          const variant = row.options?.variant ?? null;
          const addons = normalizeAddons(row.options?.addons);
          const stillValid =
            item &&
            item.status === "active" &&
            (!variant || item.variants.some((v) => v.name === variant)) &&
            addons.every((choice) => item.addons.some((a) => a.name === choice.name));
          if (!item || !stillValid) {
            skipped.push(row.name);
            continue;
          }
          restored.push({
            key: lineKey(item.id, variant, addons),
            item,
            variant,
            addons,
            quantity: new D(row.quantity).toString(),
            discount: new D(row.discount).isZero() ? "" : new D(row.discount).toFixed(2),
            sentQty: new D(row.sentQty).toString(),
          });
        }

        dispatch({ type: "replace", lines: restored });
        setDetails({
          customer: bill.customer
            ? { kind: "existing", id: bill.customer.id, name: bill.customer.name, phone: bill.customer.phone, email: bill.customer.email }
            : { kind: "walkin" },
          orderType: bill.orderType,
          tableNo: bill.tableNo ?? "",
          notes: bill.notes ?? "",
          discountKind: bill.discountType ?? "percent",
          discountValue: bill.discountType && new D(bill.discountValue).greaterThan(0) ? new D(bill.discountValue).toString() : "",
        });
        setPayment(INITIAL_PAYMENT);
        setHeldBillId(id);
        attempt.current = { signature: "", ref: "" };
        if (skipped.length > 0) toast.warning(`No longer available, so left out: ${skipped.join(", ")}`);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [items, lines.length],
  );

  // ---- Unsaved bill kept in the browser -----------------------------------------
  // Restore after mount (not during the first render, which would not match the server's HTML).
  /* eslint-disable react-hooks/set-state-in-effect -- reading browser storage can only happen after mount */
  useEffect(() => {
    const draft = loadBillDraft();
    if (draft) {
      const rebuilt: CartLine[] = [];
      for (const l of draft.lines) {
        const item = items.find((i) => i.id === l.itemId);
        if (!item || item.status !== "active") continue;
        if (l.variant && !item.variants.some((v) => v.name === l.variant)) continue;
        if (!l.addons.every((choice) => item.addons.some((a) => a.name === choice.name))) continue;
        rebuilt.push({ ...l, key: lineKey(item.id, l.variant, l.addons), item });
      }
      if (rebuilt.length > 0) {
        dispatch({ type: "replace", lines: rebuilt });
        setDetails({ ...EMPTY_DETAILS, ...draft.details });
        setHeldBillId(draft.heldBillId);
      }
    }
    setRestored(true);
    // Once, on mount: later menu refreshes must not overwrite what is on the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!restored) return;
    if (lines.length === 0) clearBillDraft();
    else saveBillDraft({ lines: toDraftLines(lines), details, heldBillId });
  }, [restored, lines, details, heldBillId]);

  // ---- Keyboard shortcuts ---------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key === "Enter") {
        event.preventDefault();
        void submit("complete");
      } else if (event.altKey && event.code === "KeyK") {
        event.preventDefault();
        void submit("kot");
      } else if (event.altKey && event.code === "KeyH") {
        event.preventDefault();
        void submit("hold");
      } else if (event.altKey && event.code === "Backspace") {
        event.preventDefault();
        if (lines.length > 0) setConfirmClear(true);
      } else if (event.key === "/" && !mod && !event.altKey && !isTyping(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit, lines.length]);

  // Closing the tab with items on the bill loses them; ask first.
  useEffect(() => {
    if (lines.length === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [lines.length]);

  const patchDetails = (patch: Partial<BillDetailsDraft>) => setDetails((d) => ({ ...d, ...patch }));
  const itemCount = lines.reduce((acc, l) => acc.plus(l.quantity), new D(0));
  const money = (v: string) => formatMoney(v, { currency: settings.currency, locale: settings.locale });

  const heldPanel = (
    <HeldBillsPanel
      bills={held}
      activeId={heldBillId}
      settings={settings}
      onResume={(id) => void resume(id)}
      onDiscarded={(id) => {
        setHeld((list) => list.filter((b) => b.id !== id));
        // Discarding the bill on screen leaves its items as an ordinary new bill.
        if (id === heldBillId) {
          setHeldBillId(null);
          attempt.current = { signature: "", ref: "" };
        }
      }}
    />
  );

  const cart = (
    <CartPanel
      lines={lines}
      dispatch={dispatch}
      details={details}
      onDetails={patchDetails}
      payment={payment}
      onPayment={setPayment}
      paymentResult={paymentResult}
      totals={totals}
      settings={settings}
      pending={pending}
      resumedFromHold={heldBillId !== null}
      problem={problem}
      onSave={() => void submit("complete")}
      onHold={() => void submit("hold")}
      onSendKitchen={() => void submit("kot")}
      onEditOptions={setEditLine}
      onClear={() => (lines.length > 0 ? setConfirmClear(true) : resetBill())}
    />
  );

  return (
    // The layout follows the width of this area (not the window), because the sidebar takes a
    // variable amount of the window. Side by side needs room for three item columns plus the bill.
    <div className="@container/pos">
      <h1 className="sr-only">New bill</h1>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @min-[1000px]/pos:h-[calc(100dvh-8.25rem)] @min-[1000px]/pos:grid-cols-[minmax(0,1fr)_24rem]">
        <ProductPanel items={items} categories={categories} lines={lines} settings={settings} searchRef={searchRef} onPick={pick} onDecrement={decrement} />
        <aside className="hidden min-h-0 flex-col gap-3 @min-[1000px]/pos:flex">
          {heldPanel}
          <div className="min-h-0 flex-1">{cart}</div>
        </aside>
      </div>

      {/* Narrower: the bill opens in a drawer from a bar that stays at the bottom of this area. */}
      <div className="sticky bottom-3 z-20 mt-4 @min-[1000px]/pos:hidden">
        <Button size="lg" className="h-12 w-full justify-between text-base shadow-lg" onClick={() => setCartOpen(true)}>
          <span className="flex items-center gap-2">
            <ShoppingBag aria-hidden /> View bill
            {lines.length > 0 ? <span className="rounded-full bg-primary-foreground/20 px-2 text-sm tabular-nums">{itemCount.toString()}</span> : null}
          </span>
          <span className="tabular-nums">{money(totals.grandTotal)}</span>
        </Button>
      </div>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="mx-auto h-[94dvh] max-w-xl gap-0 rounded-t-2xl p-2 sm:inset-x-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Current bill</SheetTitle>
            <SheetDescription>Review the bill, take payment and save it.</SheetDescription>
          </SheetHeader>
          {heldPanel}
          <div className="mt-2 min-h-0 flex-1">{cart}</div>
        </SheetContent>
      </Sheet>

      <OptionDialog
        key={optionItem?.id ?? "none"}
        item={optionItem}
        settings={settings}
        onCancel={() => setOptionItem(null)}
        onConfirm={(variant, addons) => {
          if (optionItem) dispatch({ type: "add", item: optionItem, variant, addons });
          setOptionItem(null);
        }}
      />

      <OptionDialog
        key={editLine?.key ?? "none-edit"}
        item={editLine?.item ?? null}
        settings={settings}
        initialVariant={editLine?.variant}
        initialAddons={editLine?.addons}
        confirmLabel="Update item"
        onCancel={() => setEditLine(null)}
        onConfirm={(variant, addons) => {
          if (editLine) dispatch({ type: "setOptions", key: editLine.key, variant, addons });
          setEditLine(null);
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear this bill?"
        description={heldBillId ? "The items are removed from the screen. The held bill stays in Held bills." : "All items and details on the bill are removed."}
        confirmLabel="Clear bill"
        destructive
        onConfirm={() => {
          resetBill();
          setConfirmClear(false);
        }}
      />

      <ConfirmDialog
        open={resumeId !== null}
        onOpenChange={(open) => !open && setResumeId(null)}
        title="Replace the current bill?"
        description="Resuming a held bill replaces what is on the screen. The current bill is not saved."
        confirmLabel="Replace"
        destructive
        onConfirm={() => {
          if (resumeId !== null) void resume(resumeId, true);
        }}
      />

      <SuccessDialog
        bill={saved}
        settings={appSettings}
        onNewBill={() => {
          setSaved(null);
          searchRef.current?.focus();
        }}
      />
    </div>
  );
}
