"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ItemThumb } from "@/components/menu/menu-primitives";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { fileToResizedDataUrl, IMAGE_ACCEPT } from "@/lib/image";
import { menuItemSchema, type MenuItemData, type MenuItemInput } from "@/lib/validation/menu";
import type { CategoryOption } from "@/services/CategoryService";
import type { MenuListItem } from "@/services/MenuService";

export interface MenuFormDefaults {
  currency: string;
  sgst: string;
  cgst: string;
}

interface MenuItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The item being edited, or null to create. */
  item: MenuListItem | null;
  categories: CategoryOption[];
  defaults: MenuFormDefaults;
  /** Pre-selects a category when creating (e.g. while filtered to one). */
  initialCategoryId?: number;
  onSaved: () => void;
}

type ImageChange = { kind: "keep" } | { kind: "remove" } | { kind: "set"; dataUrl: string };

const FIELD_KEYS = ["name", "description", "categoryId", "price", "sgst", "cgst", "currency", "sku", "status"] as const;

function emptyValues(defaults: MenuFormDefaults, categoryId?: number): MenuItemInput {
  return {
    name: "",
    description: "",
    categoryId: categoryId as number,
    price: "",
    sgst: defaults.sgst,
    cgst: defaults.cgst,
    currency: defaults.currency,
    status: "active",
    sku: "",
    imageUrl: null,
    isVeg: null,
    variants: [],
    addons: [],
  };
}

function valuesFor(item: MenuListItem): MenuItemInput {
  return {
    name: item.name,
    description: item.description ?? "",
    categoryId: item.categoryId,
    price: item.price,
    sgst: item.sgst,
    cgst: item.cgst,
    currency: item.currency,
    status: item.status,
    sku: item.sku ?? "",
    imageUrl: null,
    isVeg: item.isVeg,
    variants: item.variants,
    addons: item.addons,
  };
}

const vegToString = (v: boolean | null | undefined) => (v === true ? "veg" : v === false ? "nonveg" : "none");
const stringToVeg = (s: string): boolean | null => (s === "veg" ? true : s === "nonveg" ? false : null);

export function MenuItemSheet({
  open,
  onOpenChange,
  item,
  categories,
  defaults,
  initialCategoryId,
  onSaved,
}: MenuItemSheetProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageChange, setImageChange] = useState<ImageChange>({ kind: "keep" });
  const [imageBusy, setImageBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MenuItemInput, unknown, MenuItemData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: emptyValues(defaults, initialCategoryId),
  });
  const variants = useFieldArray({ control, name: "variants" });
  const addons = useFieldArray({ control, name: "addons" });

  // Each time the sheet opens (or switches item) the photo choice starts over.
  const sessionKey = open ? String(item?.id ?? "new") : "closed";
  const [seenKey, setSeenKey] = useState(sessionKey);
  if (seenKey !== sessionKey) {
    setSeenKey(sessionKey);
    setImageChange({ kind: "keep" });
  }

  useEffect(() => {
    if (!open) return;
    reset(item ? valuesFor(item) : emptyValues(defaults, initialCategoryId));
    // Reset only when the sheet opens or switches item, not on every prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const dirty = isDirty || imageChange.kind !== "keep";

  const requestClose = (next: boolean) => {
    if (next || isSubmitting) return;
    if (dirty) setDiscardOpen(true);
    else onOpenChange(false);
  };

  const previewSrc =
    imageChange.kind === "set" ? imageChange.dataUrl : imageChange.kind === "remove" ? null : (item?.imageSrc ?? null);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setImageBusy(true);
    try {
      setImageChange({ kind: "set", dataUrl: await fileToResizedDataUrl(file) });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setImageBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    // Only touch the stored photo when the user changed it.
    const payload: Record<string, unknown> = { ...values };
    if (imageChange.kind === "set") payload.imageUrl = imageChange.dataUrl;
    else if (imageChange.kind === "remove") payload.imageUrl = null;
    else if (item) delete payload.imageUrl;

    try {
      if (item) await api.patch(`/api/menu/${item.id}`, payload);
      else await api.post("/api/menu", payload);
      toast.success(item ? "Item updated" : "Item created");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors) {
        let mapped = false;
        for (const key of FIELD_KEYS) {
          const message = error.fieldErrors[key]?.[0];
          if (message) {
            setError(key, { message });
            mapped = true;
          }
        }
        if (mapped) return;
      }
      toast.error(errorMessage(error));
    }
  });

  return (
    <>
      <Sheet open={open} onOpenChange={requestClose}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle>{item ? "Edit item" : "New item"}</SheetTitle>
            <SheetDescription>
              {item ? "Changes apply to new bills. Past bills keep the details they were billed with." : "Add a product to your menu."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <FieldGroup>
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="item-name">Name</FieldLabel>
                  <Input id="item-name" autoFocus maxLength={120} aria-invalid={Boolean(errors.name)} {...register("name")} />
                  <FieldError errors={[errors.name]} />
                </Field>

                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="item-description">Description (optional)</FieldLabel>
                  <Textarea id="item-description" rows={2} maxLength={500} {...register("description")} />
                  <FieldError errors={[errors.description]} />
                </Field>

                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Field data-invalid={Boolean(errors.categoryId)}>
                      <FieldLabel htmlFor="item-category">Category</FieldLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger id="item-category" className="w-full" aria-invalid={Boolean(errors.categoryId)}>
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                              {c.status === "disabled" ? " (disabled)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[errors.categoryId]} />
                    </Field>
                  )}
                />

                <FieldSet>
                  <FieldLegend variant="label">Pricing</FieldLegend>
                  <div className="grid grid-cols-2 gap-3">
                    <Field data-invalid={Boolean(errors.price)}>
                      <FieldLabel htmlFor="item-price">Price</FieldLabel>
                      <Input id="item-price" inputMode="decimal" placeholder="0.00" aria-invalid={Boolean(errors.price)} {...register("price")} />
                      <FieldError errors={[errors.price]} />
                    </Field>
                    <Field data-invalid={Boolean(errors.sgst)}>
                      <FieldLabel htmlFor="item-sgst">SGST %</FieldLabel>
                      <Input id="item-sgst" inputMode="decimal" aria-invalid={Boolean(errors.sgst)} {...register("sgst")} />
                      <FieldError errors={[errors.sgst]} />
                    </Field>
                    <Field data-invalid={Boolean(errors.cgst)}>
                      <FieldLabel htmlFor="item-cgst">CGST %</FieldLabel>
                      <Input id="item-cgst" inputMode="decimal" aria-invalid={Boolean(errors.cgst)} {...register("cgst")} />
                      <FieldError errors={[errors.cgst]} />
                    </Field>
                    <Field data-invalid={Boolean(errors.currency)}>
                      <FieldLabel htmlFor="item-currency">Currency</FieldLabel>
                      <Input id="item-currency" maxLength={3} className="uppercase" aria-invalid={Boolean(errors.currency)} {...register("currency")} />
                      <FieldError errors={[errors.currency]} />
                    </Field>
                  </div>
                  <FieldDescription>Prices are before tax. Tax is added at billing.</FieldDescription>
                </FieldSet>

                <Field data-invalid={Boolean(errors.sku)}>
                  <FieldLabel htmlFor="item-sku">SKU / barcode (optional)</FieldLabel>
                  <Input id="item-sku" maxLength={64} autoComplete="off" aria-invalid={Boolean(errors.sku)} {...register("sku")} />
                  <FieldDescription>Scan or type a code to find this item quickly while billing.</FieldDescription>
                  <FieldError errors={[errors.sku]} />
                </Field>

                <Controller
                  control={control}
                  name="isVeg"
                  render={({ field }) => (
                    <FieldSet>
                      <FieldLegend variant="label">Type</FieldLegend>
                      <RadioGroup
                        className="flex flex-wrap gap-4"
                        value={vegToString(field.value)}
                        onValueChange={(v) => field.onChange(stringToVeg(v))}
                      >
                        {[
                          ["veg", "Veg"],
                          ["nonveg", "Non-veg"],
                          ["none", "Not applicable"],
                        ].map(([value, label]) => (
                          <label key={value} className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value={value as string} /> {label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldSet>
                  )}
                />

                <Field>
                  <FieldLabel>Photo (optional)</FieldLabel>
                  <div className="flex items-center gap-3">
                    <ItemThumb src={previewSrc} name={item?.name ?? "New item"} className="size-16" />
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInput}
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="sr-only"
                        id="item-photo"
                        onChange={(e) => void pickImage(e.target.files?.[0])}
                      />
                      <Button type="button" variant="outline" disabled={imageBusy} onClick={() => fileInput.current?.click()}>
                        {imageBusy ? <LoaderCircle className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
                        {previewSrc ? "Replace photo" : "Upload photo"}
                      </Button>
                      {previewSrc ? (
                        <Button type="button" variant="ghost" onClick={() => setImageChange({ kind: "remove" })}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <FieldDescription>PNG, JPEG or WebP. It is shrunk to fit automatically.</FieldDescription>
                </Field>

                <FieldSet>
                  <FieldLegend variant="label">Variants (optional)</FieldLegend>
                  <FieldDescription>For example sizes. The price difference is added to the base price.</FieldDescription>
                  {variants.fields.map((row, index) => (
                    <div key={row.id} className="flex items-start gap-2">
                      <Field data-invalid={Boolean(errors.variants?.[index]?.name)} className="flex-1">
                        <Input aria-label={`Variant ${index + 1} name`} placeholder="Large" {...register(`variants.${index}.name`)} />
                        <FieldError errors={[errors.variants?.[index]?.name]} />
                      </Field>
                      <Field data-invalid={Boolean(errors.variants?.[index]?.priceDelta)} className="w-28">
                        <Input aria-label={`Variant ${index + 1} price difference`} inputMode="decimal" placeholder="+0.00" {...register(`variants.${index}.priceDelta`)} />
                        <FieldError errors={[errors.variants?.[index]?.priceDelta]} />
                      </Field>
                      <Button type="button" variant="ghost" size="icon" onClick={() => variants.remove(index)} aria-label={`Remove variant ${index + 1}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => variants.append({ name: "", priceDelta: "0" })} disabled={variants.fields.length >= 10}>
                    <Plus aria-hidden /> Add variant
                  </Button>
                </FieldSet>

                <FieldSet>
                  <FieldLegend variant="label">Add-ons (optional)</FieldLegend>
                  <FieldDescription>Extras a customer can add, such as extra cheese.</FieldDescription>
                  {addons.fields.map((row, index) => (
                    <div key={row.id} className="flex items-start gap-2">
                      <Field data-invalid={Boolean(errors.addons?.[index]?.name)} className="flex-1">
                        <Input aria-label={`Add-on ${index + 1} name`} placeholder="Extra cheese" {...register(`addons.${index}.name`)} />
                        <FieldError errors={[errors.addons?.[index]?.name]} />
                      </Field>
                      <Field data-invalid={Boolean(errors.addons?.[index]?.price)} className="w-28">
                        <Input aria-label={`Add-on ${index + 1} price`} inputMode="decimal" placeholder="0.00" {...register(`addons.${index}.price`)} />
                        <FieldError errors={[errors.addons?.[index]?.price]} />
                      </Field>
                      <Button type="button" variant="ghost" size="icon" onClick={() => addons.remove(index)} aria-label={`Remove add-on ${index + 1}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => addons.append({ name: "", price: "" })} disabled={addons.fields.length >= 20}>
                    <Plus aria-hidden /> Add add-on
                  </Button>
                </FieldSet>

                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Switch
                        id="item-status"
                        checked={field.value === "active"}
                        onCheckedChange={(checked) => field.onChange(checked ? "active" : "disabled")}
                      />
                      <div className="flex flex-col gap-0.5">
                        <FieldLabel htmlFor="item-status">Available for sale</FieldLabel>
                        <FieldDescription>Turn off to hide this item on the billing screen.</FieldDescription>
                      </div>
                    </Field>
                  )}
                />
              </FieldGroup>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" onClick={() => requestClose(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || imageBusy}>
                {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
                {item ? "Save changes" : "Create item"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard your changes?"
        description="You have unsaved changes to this item. They will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
