"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { StaffListItem } from "@/services/StaffService";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The person being edited, or null to add someone new. */
  member: StaffListItem | null;
  onSaved: () => void;
}

export function StaffFormDialog({ open, onOpenChange, member, onSaved }: StaffFormDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [isCashier, setIsCashier] = useState(true);
  const [active, setActive] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Start from the right values each time the dialog opens.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting the form when it opens */
  useEffect(() => {
    if (!open) return;
    setName(member?.name ?? "");
    setTitle(member?.title ?? "");
    setIsCashier(member?.isCashier ?? true);
    setActive((member?.status ?? "active") === "active");
    setNameError(null);
  }, [open, member]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") return void setNameError("Name is required");
    setPending(true);
    const body = { name, title: title.trim() || null, isCashier, status: active ? "active" : "disabled" };
    try {
      if (member) await api.patch(`/api/staff/${member.id}`, body);
      else await api.post("/api/staff", body);
      toast.success(member ? "Staff member updated" : "Staff member added");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors?.name?.[0]) setNameError(error.fieldErrors.name[0]);
      else toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? "Edit staff member" : "Add staff member"}</DialogTitle>
          <DialogDescription>
            They don&apos;t get a login. The cashier is picked from this list on each bill.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="staff-name">Name</FieldLabel>
              <Input
                id="staff-name"
                autoFocus
                maxLength={60}
                value={name}
                aria-invalid={Boolean(nameError)}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
              />
              {nameError ? <FieldError>{nameError}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="staff-title">Title (optional)</FieldLabel>
              <Input
                id="staff-title"
                maxLength={40}
                placeholder="Cashier, Chef, Cook..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <Field orientation="horizontal">
              <Switch id="staff-cashier" checked={isCashier} onCheckedChange={setIsCashier} />
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="staff-cashier">Can take payments</FieldLabel>
                <FieldDescription>Shows up in the cashier choice on the billing screen.</FieldDescription>
              </div>
            </Field>

            <Field orientation="horizontal">
              <Switch id="staff-active" checked={active} onCheckedChange={setActive} />
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="staff-active">Active</FieldLabel>
                <FieldDescription>
                  Turn off for someone who has left. Their past bills keep their name.
                </FieldDescription>
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {member ? "Save changes" : "Add person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
