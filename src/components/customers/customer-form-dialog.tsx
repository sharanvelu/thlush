"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { customerSchema, parseTags } from "@/lib/validation/customer";
import type { CustomerRecord } from "@/services/CustomerService";

const formSchema = customerSchema.omit({ tags: true }).extend({ tagsText: z.string().max(400, "Too many tags") });
type FormInput = z.input<typeof formSchema>;
type FormData = z.output<typeof formSchema>;

const EMPTY: FormInput = { name: "", phone: "", email: "", notes: "", tagsText: "" };

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerRecord | null;
  onSaved: () => void;
}

export function CustomerFormDialog({ open, onOpenChange, customer, onSaved }: CustomerFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormData>({ resolver: zodResolver(formSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      customer
        ? { name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", notes: customer.notes ?? "", tagsText: customer.tags.join(", ") }
        : EMPTY,
    );
  }, [open, customer, reset]);

  const onSubmit = handleSubmit(async ({ tagsText, ...values }) => {
    const body = { ...values, tags: parseTags(tagsText) };
    try {
      if (customer) await api.patch(`/api/customers/${customer.id}`, body);
      else await api.post("/api/customers", body);
      toast.success(customer ? "Customer updated" : "Customer added");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors?.phone?.[0]) setError("phone", { message: error.fieldErrors.phone[0] });
      else if (error instanceof ApiClientError && error.fieldErrors) {
        const [field, messages] = Object.entries(error.fieldErrors)[0] ?? [];
        const mapped = field === "tags" ? "tagsText" : field;
        if (mapped && messages?.[0] && mapped in EMPTY) setError(mapped as keyof FormInput, { message: messages[0] });
        else toast.error(errorMessage(error));
      } else toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>Customers you add here show up when you start typing a name on the billing screen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="customer-name">Name</FieldLabel>
              <Input id="customer-name" autoFocus maxLength={120} aria-invalid={Boolean(errors.name)} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="customer-phone">Phone (optional)</FieldLabel>
                <Input id="customer-phone" type="tel" inputMode="tel" maxLength={20} aria-invalid={Boolean(errors.phone)} {...register("phone")} />
                <FieldError errors={[errors.phone]} />
              </Field>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="customer-email">Email (optional)</FieldLabel>
                <Input id="customer-email" type="email" maxLength={120} aria-invalid={Boolean(errors.email)} {...register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
            </div>
            <Field data-invalid={Boolean(errors.tagsText)}>
              <FieldLabel htmlFor="customer-tags">Tags (optional)</FieldLabel>
              <Input id="customer-tags" placeholder="regular, office" aria-invalid={Boolean(errors.tagsText)} {...register("tagsText")} />
              <FieldDescription>Separate with commas. Up to 10.</FieldDescription>
              <FieldError errors={[errors.tagsText]} />
            </Field>
            <Field data-invalid={Boolean(errors.notes)}>
              <FieldLabel htmlFor="customer-notes">Notes (optional)</FieldLabel>
              <Textarea id="customer-notes" rows={3} maxLength={500} {...register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {customer ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
