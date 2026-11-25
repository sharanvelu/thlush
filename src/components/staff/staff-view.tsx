"use client";

import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PAGE_COPY } from "@/config/page-copy";
import { api, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { StaffListItem } from "@/services/StaffService";

export function StaffView({ staff }: { staff: StaffListItem[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffListItem | null>(null);
  const [deleting, setDeleting] = useState<StaffListItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const setStatus = async (member: StaffListItem, active: boolean) => {
    try {
      await api.patch(`/api/staff/${member.id}`, { status: active ? "active" : "disabled" });
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await api.delete(`/api/staff/${deleting.id}`);
      toast.success(`Removed ${deleting.name}`);
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <PageHeader
        title={PAGE_COPY.staff.title}
        description={PAGE_COPY.staff.description}
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden /> Add person
          </Button>
        }
      />

      {staff.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No staff yet"
          description="Add the people who work at the counter. On the shared Counter login, the cashier is picked from this list on each bill."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden /> Add your first person
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Staff">
          {staff.map((member) => {
            const disabled = member.status === "disabled";
            return (
              <li key={member.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
                    disabled && "opacity-50",
                  )}
                >
                  <UserRound className="size-5" aria-hidden />
                </span>
                <div className={cn("min-w-0 flex-1", disabled && "opacity-60")}>
                  <p className="truncate font-medium">{member.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.title ?? "No title"}
                    {member.billCount > 0 ? ` · ${member.billCount} ${member.billCount === 1 ? "bill" : "bills"}` : ""}
                  </p>
                </div>
                {member.isCashier ? <Badge variant="secondary">Cashier</Badge> : null}
                <Switch
                  checked={!disabled}
                  onCheckedChange={(checked) => void setStatus(member, checked)}
                  aria-label={`${member.name} is active`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${member.name}`}
                  onClick={() => {
                    setEditing(member);
                    setFormOpen(true);
                  }}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${member.name}`}
                  onClick={() => setDeleting(member)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <StaffFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} onSaved={() => router.refresh()} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.name ?? ""}?`}
        description={
          deleting && deleting.billCount > 0
            ? "This person is on past bills, so they can't be removed. Turn them off instead and their bills keep their name."
            : "They are removed from the list. This can't be undone."
        }
        confirmLabel="Remove"
        destructive
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
