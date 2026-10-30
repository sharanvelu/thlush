"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, ROLES } from "@/config/permissions";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { passwordSchema } from "@/lib/validation/user";
import type { AdminUser } from "@/services/UserAdminService";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The user being edited, or null to create one. */
  user: AdminUser | null;
  /** Your own id, so you can't change your own role from here. */
  currentUserId: string;
  onSaved: () => void;
}

const base = {
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  role: z.enum(ROLES),
};
type Values = { name: string; email: string; role: (typeof ROLES)[number]; password: string };

export function UserFormDialog({ open, onOpenChange, user, currentUserId, onSaved }: UserFormDialogProps) {
  const editing = user !== null;
  const isSelf = user?.id === currentUserId;
  const [showPassword, setShowPassword] = useState(false);
  const schema = useMemo(
    () => z.object({ ...base, password: editing ? z.union([z.literal(""), passwordSchema]) : passwordSchema }),
    [editing],
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", role: "billing", password: "" } });

  useEffect(() => {
    if (!open) return;
    reset(user ? { name: user.name, email: user.email, role: user.role, password: "" } : { name: "", email: "", role: "billing", password: "" });
  }, [open, user, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const body: Record<string, unknown> = { name: values.name, email: values.email, role: values.role };
    if (values.password) body.password = values.password;
    try {
      if (user) await api.patch(`/api/admin/users/${user.id}`, body);
      else await api.post("/api/admin/users", body);
      toast.success(user ? "User updated" : "User created");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.fieldErrors?.email?.[0]) setError("email", { message: error.fieldErrors.email[0] });
      else toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        if (!next) setShowPassword(false); // Never reopen with the password showing.
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {editing ? "Change their details, role, or set a new password." : "They can sign in with this email and password straight away."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="user-name">Name</FieldLabel>
              <Input id="user-name" autoFocus maxLength={100} aria-invalid={Boolean(errors.name)} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input id="user-email" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="user-role">Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                    <SelectTrigger id="user-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSelf ? <FieldDescription>You can&apos;t change your own role.</FieldDescription> : null}
                </Field>
              )}
            />
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="user-password">{editing ? "New password (optional)" : "Password"}</FieldLabel>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-1 size-8 -translate-y-1/2" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </Button>
              </div>
              <FieldDescription>{editing ? "Leave blank to keep the current password." : "At least 8 characters, with a letter and a number."}</FieldDescription>
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {editing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
