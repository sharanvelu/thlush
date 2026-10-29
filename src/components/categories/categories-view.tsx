"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripVertical, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/categories/category-icon";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { CategoryListItem } from "@/services/CategoryService";

interface RowProps {
  category: CategoryListItem;
  onToggle: (category: CategoryListItem, active: boolean) => void;
  onEdit: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
}

function SortableRow({ category, onToggle, onEdit, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const disabled = category.status === "disabled";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card",
        isDragging && "relative z-10 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent active:cursor-grabbing"
        aria-label={`Reorder ${category.name}. Press space, then use arrow keys.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <CategoryBadge icon={category.icon} color={category.color} className={cn(disabled && "opacity-50")} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("truncate font-medium", disabled && "text-muted-foreground")}>{category.name}</span>
          {disabled ? (
            <Badge variant="secondary" className="gap-1">
              <EyeOff className="size-3" aria-hidden /> Hidden in POS
            </Badge>
          ) : null}
        </div>
        {category.description ? (
          <p className="truncate text-xs text-muted-foreground">{category.description}</p>
        ) : null}
      </div>

      <Link
        href={`/menu?category=${category.id}`}
        className="hidden shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground tabular-nums hover:bg-accent hover:text-foreground sm:block"
        aria-label={`${category.itemCount} items in ${category.name}. View them.`}
      >
        {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
      </Link>

      <Switch
        checked={!disabled}
        onCheckedChange={(checked) => onToggle(category, checked)}
        aria-label={`${category.name} is ${disabled ? "disabled" : "active"}`}
      />
      <Button variant="ghost" size="icon" onClick={() => onEdit(category)} aria-label={`Edit ${category.name}`}>
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(category)} aria-label={`Delete ${category.name}`}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </li>
  );
}

export function CategoriesView({ categories }: { categories: CategoryListItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local copy so reordering and toggling feel instant; resynced when the server data changes.
  const [items, setItems] = useState(categories);
  const [seen, setSeen] = useState(categories);
  if (categories !== seen) {
    setSeen(categories);
    setItems(categories);
  }

  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [editing, setEditing] = useState<CategoryListItem | null>(null);
  const [deleting, setDeleting] = useState<CategoryListItem | null>(null);
  const [blocked, setBlocked] = useState<CategoryListItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = items;
    const from = previous.findIndex((c) => c.id === active.id);
    const to = previous.findIndex((c) => c.id === over.id);
    if (from < 0 || to < 0) return;

    const next = arrayMove(previous, from, to);
    setItems(next); // Optimistic.
    try {
      await api.post("/api/categories/reorder", { ids: next.map((c) => c.id) });
      toast.success("Order saved");
    } catch (error) {
      setItems(previous);
      toast.error(`Could not save the new order. ${errorMessage(error)}`);
    }
  };

  const onToggle = async (category: CategoryListItem, active: boolean) => {
    const status = active ? "active" : "disabled";
    setItems((list) => list.map((c) => (c.id === category.id ? { ...c, status } : c)));
    try {
      await api.patch(`/api/categories/${category.id}`, { status });
    } catch (error) {
      setItems((list) => list.map((c) => (c.id === category.id ? { ...c, status: category.status } : c)));
      toast.error(errorMessage(error));
    }
  };

  const requestDelete = (category: CategoryListItem) => {
    if (category.itemCount > 0) setBlocked(category);
    else setDeleting(category);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await api.delete(`/api/categories/${deleting.id}`);
      setItems((list) => list.filter((c) => c.id !== deleting.id));
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(null);
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Drag to set the order of the tabs on the billing screen. Disabled categories and their items are hidden there."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden /> Add category
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create categories like Beverages or Snacks, then add menu items to them."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden /> Add your first category
            </Button>
          }
        />
      ) : (
        <DndContext id="categories-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2" aria-label="Categories, in billing screen order">
              {items.map((category) => (
                <SortableRow
                  key={category.id}
                  category={category}
                  onToggle={onToggle}
                  onEdit={(c) => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                  onDelete={requestDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name ?? ""}"?`}
        description="This category is empty, so nothing else is affected. This can't be undone."
        confirmLabel="Delete category"
        destructive
        pending={deletePending}
        onConfirm={confirmDelete}
      />

      <AlertDialog open={blocked !== null} onOpenChange={(open) => !open && setBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>&quot;{blocked?.name}&quot; still has items</AlertDialogTitle>
            <AlertDialogDescription>
              It holds {blocked?.itemCount} menu {blocked?.itemCount === 1 ? "item" : "items"}. Move them to another
              category or delete them first. To hide the category without deleting it, turn it off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href={`/menu?category=${blocked?.id}`}>View items</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
