"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { supplierSchema } from "@/lib/validation/inventory";
import type { SupplierRecord } from "@/services/PurchasingService";

interface FormInput {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}
type FieldName = keyof FormInput;

const formSchema = supplierSchema.omit({ status: true });
const EMPTY: FormInput = { name: "", contactName: "", phone: "", email: "", address: "", notes: "" };
const FIELDS = Object.keys(EMPTY) as FieldName[];

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierRecord | null;
  onSaved: () => void;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSaved }: SupplierDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ defaultValues: EMPTY, resolver: zodResolver(formSchema) as Resolver<FormInput> });

  useEffect(() => {
    if (!open) return;
    reset(
      supplier
        ? { name: supplier.name, contactName: supplier.contactName ?? "", phone: supplier.phone ?? "", email: supplier.email ?? "", address: supplier.address ?? "", notes: supplier.notes ?? "" }
        : EMPTY,
    );
  }, [open, supplier, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (supplier) await api.patch(`/api/inventory/suppliers/${supplier.id}`, values);
      else await api.post("/api/inventory/suppliers", values);
      toast.success(supplier ? "Supplier updated" : "Supplier added");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors) {
        const [field, messages] = Object.entries(error.fieldErrors)[0] ?? [];
        if (field && messages?.[0] && (FIELDS as string[]).includes(field)) setError(field as FieldName, { message: messages[0] });
        else toast.error(errorMessage(error));
      } else toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle>
          <DialogDescription>Suppliers can be picked when you receive stock.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="supplier-name">Name</FieldLabel>
              <Input id="supplier-name" autoFocus maxLength={120} aria-invalid={Boolean(errors.name)} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.contactName)}>
                <FieldLabel htmlFor="supplier-contact">Contact person</FieldLabel>
                <Input id="supplier-contact" maxLength={100} {...register("contactName")} />
                <FieldError errors={[errors.contactName]} />
              </Field>
              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="supplier-phone">Phone</FieldLabel>
                <Input id="supplier-phone" type="tel" inputMode="tel" maxLength={30} {...register("phone")} />
                <FieldError errors={[errors.phone]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="supplier-email">Email</FieldLabel>
              <Input id="supplier-email" type="email" maxLength={120} aria-invalid={Boolean(errors.email)} {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Field data-invalid={Boolean(errors.address)}>
              <FieldLabel htmlFor="supplier-address">Address</FieldLabel>
              <Textarea id="supplier-address" rows={2} maxLength={300} {...register("address")} />
              <FieldError errors={[errors.address]} />
            </Field>
            <Field data-invalid={Boolean(errors.notes)}>
              <FieldLabel htmlFor="supplier-notes">Notes</FieldLabel>
              <Textarea id="supplier-notes" rows={2} maxLength={500} {...register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {supplier ? "Save changes" : "Add supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
