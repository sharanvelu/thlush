"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CATEGORY_ICON_COMPONENTS } from "@/components/categories/category-icon";
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
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/config/category-icons";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { categorySchema, type CategoryData, type CategoryInput } from "@/lib/validation/category";
import type { CategoryListItem } from "@/services/CategoryService";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The category being edited, or null to create a new one. */
  category: CategoryListItem | null;
  onSaved: () => void;
}

const EMPTY: CategoryInput = { name: "", description: "", status: "active", color: CATEGORY_COLORS[0], icon: "utensils" };

export function CategoryFormDialog({ open, onOpenChange, category, onSaved }: CategoryFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput, unknown, CategoryData>({
    resolver: zodResolver(categorySchema),
    defaultValues: EMPTY,
  });

  // Load the right values each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? {
            name: category.name,
            description: category.description ?? "",
            status: category.status,
            color: category.color,
            icon: category.icon as CategoryInput["icon"],
          }
        : EMPTY,
    );
  }, [open, category, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (category) await api.patch(`/api/categories/${category.id}`, values);
      else await api.post("/api/categories", values);
      toast.success(category ? "Category updated" : "Category created");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setError("name", { message: error.message });
      } else {
        toast.error(errorMessage(error));
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => (isSubmitting ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories group your menu and set the order of the tabs on the billing screen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input id="category-name" autoFocus maxLength={60} aria-invalid={Boolean(errors.name)} {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="category-description">Description (optional)</FieldLabel>
              <Textarea id="category-description" rows={2} maxLength={200} {...register("description")} />
              <FieldError errors={[errors.description]} />
            </Field>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch
                    id="category-status"
                    checked={field.value === "active"}
                    onCheckedChange={(checked) => field.onChange(checked ? "active" : "disabled")}
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="category-status">Active</FieldLabel>
                    <FieldDescription>When off, this category and its items are hidden on the billing screen.</FieldDescription>
                  </div>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <Field>
                  <FieldLabel id="category-color-label">Colour</FieldLabel>
                  <div role="radiogroup" aria-labelledby="category-color-label" className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((color) => {
                      const selected = field.value === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={color}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition",
                            selected && "ring-2 ring-foreground",
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {selected ? <Check className="size-4 text-white" aria-hidden /> : null}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <Field>
                  <FieldLabel id="category-icon-label">Icon</FieldLabel>
                  <div role="radiogroup" aria-labelledby="category-icon-label" className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {CATEGORY_ICONS.map((name) => {
                      const Icon = CATEGORY_ICON_COMPONENTS[name];
                      const selected = field.value === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={name.replace("-", " ")}
                          onClick={() => field.onChange(name)}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent",
                            selected && "border-primary bg-accent text-accent-foreground",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              {category ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
