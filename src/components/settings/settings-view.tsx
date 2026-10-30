"use client";

import { ImagePlus, LoaderCircle, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/settings/section";
import { useGroupForm } from "@/components/settings/use-group-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { accentCss, contrastRatio, DEFAULT_ACCENT, isHexColor, readableOn } from "@/lib/color";
import { errorMessage } from "@/lib/api-client";
import { fileToResizedDataUrl, IMAGE_ACCEPT } from "@/lib/image";
import { formatMoney } from "@/lib/money";
import type { AppSettings } from "@/types/settings";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];
const LOCALES = ["en-IN", "en-US", "en-GB", "en-AU", "en-CA", "hi-IN", "ta-IN", "de-DE", "fr-FR"];
const ZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney", "UTC"];
const ACCENTS: Array<[string, string]> = [["Orange", "#cc3300"], ["Blue", "#1d4ed8"], ["Green", "#15803d"], ["Purple", "#7e22ce"], ["Rose", "#be123c"], ["Slate", "#334155"]];

type GroupProps<K extends keyof AppSettings> = { initial: AppSettings[K] };

function Text({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function ToggleRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field orientation="horizontal">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <div className="flex flex-col gap-0.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{hint}</FieldDescription>
      </div>
    </Field>
  );
}

function BusinessForm({ initial }: GroupProps<"business">) {
  const f = useGroupForm("business", initial);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { values: v, errors: e, set } = f;

  const pickLogo = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    try {
      set({ logoUrl: await fileToResizedDataUrl(picked, 256) });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <Section title="Business profile" description="Shown on receipts and in the sidebar." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={f.discard}>
      <FieldGroup>
        <Field>
          <FieldLabel>Logo</FieldLabel>
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted text-muted-foreground">
              {v.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a small logo saved in settings
                <img src={v.logoUrl} alt="Current logo" className="size-full object-cover" />
              ) : (
                <Store className="size-6" aria-hidden />
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <input ref={file} type="file" accept={IMAGE_ACCEPT} className="sr-only" id="logo-file" onChange={(ev) => void pickLogo(ev.target.files?.[0])} />
              <Button type="button" variant="outline" disabled={busy} onClick={() => file.current?.click()}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
                {v.logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              {v.logoUrl ? <Button type="button" variant="ghost" onClick={() => set({ logoUrl: null })}>Remove</Button> : null}
            </div>
          </div>
          <FieldDescription>PNG, JPEG or WebP. It is shrunk to fit. Receipts print it in black and white.</FieldDescription>
          <FieldError>{e.logoUrl}</FieldError>
        </Field>
        <Text id="biz-name" label="Business name" error={e.name}>
          <Input id="biz-name" value={v.name} maxLength={80} onChange={(ev) => set({ name: ev.target.value })} aria-invalid={Boolean(e.name)} />
        </Text>
        <Text id="biz-address" label="Address" error={e.address} hint="Each line prints on its own line on the receipt.">
          <Textarea id="biz-address" rows={3} maxLength={300} value={v.address} onChange={(ev) => set({ address: ev.target.value })} />
        </Text>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="biz-phone" label="Phone" error={e.phone}>
            <Input id="biz-phone" type="tel" value={v.phone} maxLength={30} onChange={(ev) => set({ phone: ev.target.value })} />
          </Text>
          <Text id="biz-email" label="Email" error={e.email}>
            <Input id="biz-email" type="email" value={v.email} maxLength={120} onChange={(ev) => set({ email: ev.target.value })} aria-invalid={Boolean(e.email)} />
          </Text>
        </div>
        <Text id="biz-gstin" label="GSTIN" error={e.gstin} hint="Printed on receipts.">
          <Input id="biz-gstin" className="uppercase" value={v.gstin} maxLength={20} onChange={(ev) => set({ gstin: ev.target.value })} aria-invalid={Boolean(e.gstin)} />
        </Text>
      </FieldGroup>
    </Section>
  );
}

function LocaleForm({ initial }: GroupProps<"locale">) {
  const f = useGroupForm("locale", initial);
  const { values: v, errors: e, set } = f;
  let preview = "";
  try {
    preview = `${formatMoney("1234.5", { currency: v.currency.toUpperCase(), locale: v.locale })} · ${new Intl.DateTimeFormat(v.locale, { dateStyle: "medium", timeStyle: "short", timeZone: v.timezone }).format(new Date())}`;
  } catch {
    preview = "Not a valid combination yet";
  }
  return (
    <Section title="Currency and locale" description="How amounts and dates are written, and which time zone counts as 'today'." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={f.discard}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Text id="loc-currency" label="Currency" error={e.currency}>
            <Input id="loc-currency" list="currency-options" className="uppercase" maxLength={3} value={v.currency} onChange={(ev) => set({ currency: ev.target.value })} aria-invalid={Boolean(e.currency)} />
          </Text>
          <Text id="loc-locale" label="Locale" error={e.locale}>
            <Input id="loc-locale" list="locale-options" value={v.locale} onChange={(ev) => set({ locale: ev.target.value })} aria-invalid={Boolean(e.locale)} />
          </Text>
          <Text id="loc-zone" label="Time zone" error={e.timezone}>
            <Input id="loc-zone" list="zone-options" value={v.timezone} onChange={(ev) => set({ timezone: ev.target.value })} aria-invalid={Boolean(e.timezone)} />
          </Text>
        </div>
        <datalist id="currency-options">{CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="locale-options">{LOCALES.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="zone-options">{ZONES.map((c) => <option key={c} value={c} />)}</datalist>
        <p className="text-sm text-muted-foreground">Preview: <span className="font-medium text-foreground">{preview}</span></p>
        <p className="text-xs text-muted-foreground">New menu items use this currency. Existing items and past bills keep theirs.</p>
      </FieldGroup>
    </Section>
  );
}

function TaxForm({ initial }: GroupProps<"tax">) {
  const f = useGroupForm("tax", initial);
  const { values: v, errors: e, set } = f;
  return (
    <Section title="Tax" description="SGST and CGST are added on top of item prices." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={f.discard}>
      <FieldGroup>
        <ToggleRow id="tax-on" label="Charge tax on bills" hint="Turn off for businesses that do not charge GST. Past bills are not changed." checked={!v.ignoreTax} onChange={(on) => set({ ignoreTax: !on })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="tax-sgst" label="Default SGST %" error={e.defaultSgst} hint="Pre-filled for new menu items.">
            <Input id="tax-sgst" inputMode="decimal" value={v.defaultSgst} onChange={(ev) => set({ defaultSgst: ev.target.value })} aria-invalid={Boolean(e.defaultSgst)} />
          </Text>
          <Text id="tax-cgst" label="Default CGST %" error={e.defaultCgst}>
            <Input id="tax-cgst" inputMode="decimal" value={v.defaultCgst} onChange={(ev) => set({ defaultCgst: ev.target.value })} aria-invalid={Boolean(e.defaultCgst)} />
          </Text>
        </div>
      </FieldGroup>
    </Section>
  );
}

function ReceiptForm({ initial }: GroupProps<"receipt">) {
  const f = useGroupForm("receipt", initial);
  const { values: v, errors: e, set } = f;
  return (
    <Section title="Receipts" description="Text and paper width for printed and PDF receipts." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={f.discard}>
      <FieldGroup>
        <Text id="rc-header" label="Header text" error={e.header} hint="Printed under the business details. Optional.">
          <Input id="rc-header" value={v.header} maxLength={200} onChange={(ev) => set({ header: ev.target.value })} />
        </Text>
        <Text id="rc-footer" label="Footer message" error={e.footer}>
          <Input id="rc-footer" value={v.footer} maxLength={200} onChange={(ev) => set({ footer: ev.target.value })} />
        </Text>
        <Field>
          <FieldLabel id="rc-paper">Paper width</FieldLabel>
          <ToggleGroup type="single" variant="outline" value={v.paperSize} onValueChange={(p) => p && set({ paperSize: p as "58mm" | "80mm" })} aria-labelledby="rc-paper">
            <ToggleGroupItem value="80mm" className="px-4">80 mm</ToggleGroupItem>
            <ToggleGroupItem value="58mm" className="px-4">58 mm</ToggleGroupItem>
          </ToggleGroup>
          <FieldDescription>58 mm drops the unit price column to fit.</FieldDescription>
        </Field>
      </FieldGroup>
    </Section>
  );
}

function BillingForm({ initial }: GroupProps<"billing">) {
  const f = useGroupForm("billing", initial);
  const { values: v, errors: e, set } = f;
  const example = `${v.billPrefix}20261030-${String(7).padStart(Math.min(8, Math.max(1, v.sequencePadding || 1)), "0")}`;
  return (
    <Section title="Billing" description="Bill numbers and checkout behaviour." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={f.discard}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="bill-prefix" label="Bill number prefix" error={e.billPrefix} hint="Numbers look like prefix + date + counter that restarts each day.">
            <Input id="bill-prefix" value={v.billPrefix} maxLength={10} onChange={(ev) => set({ billPrefix: ev.target.value })} aria-invalid={Boolean(e.billPrefix)} />
          </Text>
          <Text id="bill-pad" label="Counter digits" error={e.sequencePadding}>
            <Input id="bill-pad" type="number" min={1} max={8} value={v.sequencePadding} onChange={(ev) => set({ sequencePadding: Number(ev.target.value) })} aria-invalid={Boolean(e.sequencePadding)} />
          </Text>
        </div>
        <p className="text-sm text-muted-foreground">Next bill will look like: <span className="font-mono font-medium text-foreground">{example}</span></p>
        <Text id="bill-walkin" label="Name for bills without a customer" error={e.defaultCustomerName}>
          <Input id="bill-walkin" value={v.defaultCustomerName} maxLength={60} onChange={(ev) => set({ defaultCustomerName: ev.target.value })} />
        </Text>
        <ToggleRow id="bill-block" label="Block selling items that are out of stock" hint="Applies to items that track stock. Off, stock can go below zero." checked={v.blockOutOfStock} onChange={(on) => set({ blockOutOfStock: on })} />
      </FieldGroup>
    </Section>
  );
}

function AppearanceForm({ initial }: GroupProps<"appearance">) {
  const f = useGroupForm("appearance", initial);
  const { values: v, errors: e, set } = f;
  const [text, setText] = useState(v.accent ?? DEFAULT_ACCENT);
  const accent = v.accent ?? DEFAULT_ACCENT;

  // Preview the colour live; it goes away when you leave without saving.
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "accent-preview";
    style.textContent = accentCss(accent);
    document.head.appendChild(style);
    return () => style.remove();
  }, [accent]);

  const ratio = contrastRatio(accent, readableOn(accent));
  const choose = (hex: string) => {
    setText(hex);
    set({ accent: hex.toLowerCase() === DEFAULT_ACCENT ? null : hex.toLowerCase() });
  };

  return (
    <Section title="Accent colour" description="The colour of buttons, highlights and charts. Changes preview as you pick." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={() => { f.discard(); setText(initial.accent ?? DEFAULT_ACCENT); }}>
      <FieldGroup>
        <div className="flex flex-wrap items-center gap-3">
          <input type="color" aria-label="Pick a colour" value={accent} onChange={(ev) => choose(ev.target.value)} className="size-10 cursor-pointer rounded-lg border bg-transparent p-1" />
          <Input aria-label="Colour as hex" className="w-32 font-mono" value={text} maxLength={7} onChange={(ev) => { setText(ev.target.value); if (isHexColor(ev.target.value)) set({ accent: ev.target.value.toLowerCase() === DEFAULT_ACCENT ? null : ev.target.value.toLowerCase() }); }} aria-invalid={text !== "" && !isHexColor(text)} />
          <Button type="button" variant="ghost" onClick={() => choose(DEFAULT_ACCENT)}>Reset to default</Button>
        </div>
        {text !== "" && !isHexColor(text) ? <p role="alert" className="text-xs text-destructive">Use a colour like #cc3300.</p> : null}
        <FieldError>{e.accent}</FieldError>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested colours">
          {ACCENTS.map(([label, hex]) => (
            <button key={hex} type="button" onClick={() => choose(hex)} aria-label={label} aria-pressed={accent.toLowerCase() === hex} title={label} className="size-8 rounded-full ring-offset-2 ring-offset-background transition aria-pressed:ring-2 aria-pressed:ring-foreground" style={{ backgroundColor: hex }} />
          ))}
        </div>
        <p className={`text-sm ${ratio >= 4.5 ? "text-muted-foreground" : "text-destructive"}`} role="status">
          Button text contrast: {ratio.toFixed(1)}:1 {ratio >= 4.5 ? "(passes WCAG AA)" : "(too low to read comfortably, pick a darker or lighter colour)"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Primary button</Button>
          <Button type="button" variant="outline">Outline</Button>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Badge</span>
        </div>
      </FieldGroup>
    </Section>
  );
}

function FeaturesForm({ initial }: GroupProps<"features">) {
  const f = useGroupForm("features", initial);
  const { values: v, set } = f;
  return (
    <Section title="Features" description="Turn parts of the app on or off for your business." dirty={f.dirty} saving={f.saving} onSave={f.save} onDiscard={f.discard}>
      <FieldGroup>
        <ToggleRow id="ft-inv" label="Inventory" hint="Stock overview, adjustments, suppliers and low-stock alerts. Hides the Inventory section when off." checked={v.inventory} onChange={(on) => set({ inventory: on })} />
        <ToggleRow id="ft-disc" label="Discounts" hint="Line and bill discounts on the billing screen." checked={v.discounts} onChange={(on) => set({ discounts: on })} />
        <ToggleRow id="ft-order" label="Order types" hint="Dine-in, takeaway and delivery, with table numbers." checked={v.orderTypes} onChange={(on) => set({ orderTypes: on })} />
      </FieldGroup>
    </Section>
  );
}

export function SettingsView({ settings }: { settings: AppSettings }) {
  return (
    <Tabs defaultValue="business" className="gap-6">
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="w-max">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="locale">Locale &amp; tax</TabsTrigger>
          <TabsTrigger value="receipt">Receipts</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>
      </div>
      <div className="max-w-3xl">
        <TabsContent value="business"><BusinessForm initial={settings.business} /></TabsContent>
        <TabsContent value="locale" className="flex flex-col gap-6">
          <LocaleForm initial={settings.locale} />
          <TaxForm initial={settings.tax} />
        </TabsContent>
        <TabsContent value="receipt"><ReceiptForm initial={settings.receipt} /></TabsContent>
        <TabsContent value="billing"><BillingForm initial={settings.billing} /></TabsContent>
        <TabsContent value="appearance"><AppearanceForm initial={settings.appearance} /></TabsContent>
        <TabsContent value="features"><FeaturesForm initial={settings.features} /></TabsContent>
      </div>
    </Tabs>
  );
}
