"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import type { AdminUser } from "@/services/UserAdminService";

export function UserActions({ user, currentUserId }: { user: AdminUser; currentUserId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);
  const self = user.id === currentUserId;

  const remove = async () => {
    setPending(true);
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      toast.success(`Deleted ${user.name}`);
      router.replace("/admin/users");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
      setPending(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil aria-hidden /> Edit
      </Button>
      <Button variant="destructive" disabled={self} title={self ? "You can't delete your own account" : undefined} onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <UserFormDialog open={editing} onOpenChange={setEditing} user={user} currentUserId={currentUserId} onSaved={() => router.refresh()} />
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={`Delete ${user.name}?`} description="They can no longer sign in. Their bills and audit history are kept. This can't be undone." confirmLabel="Delete user" destructive pending={pending} onConfirm={remove} />
    </>
  );
}
