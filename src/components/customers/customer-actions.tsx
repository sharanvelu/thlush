"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api-client";
import type { CustomerRecord } from "@/services/CustomerService";

export function CustomerActions({ customer }: { customer: CustomerRecord }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState(false);

  const remove = async () => {
    setPending(true);
    try {
      await api.delete(`/api/customers/${customer.id}`);
      toast.success(`Deleted ${customer.name}`);
      router.replace("/customers");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil aria-hidden /> Edit
      </Button>
      <Button variant="destructive" onClick={() => setDeleting(true)}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <CustomerFormDialog open={editing} onOpenChange={setEditing} customer={customer} onSaved={() => router.refresh()} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${customer.name}?`}
        description={`${customer.orders > 0 ? `Their ${customer.orders} ${customer.orders === 1 ? "bill stays" : "bills stay"} in Bill History and will show as walk-in. ` : ""}This can't be undone.`}
        confirmLabel="Delete customer"
        destructive
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}
