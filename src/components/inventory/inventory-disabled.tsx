import { PackageX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

/** Shown on inventory pages when the Inventory feature is switched off in Settings. */
export function InventoryDisabled({ canChange }: { canChange: boolean }) {
  return (
    <EmptyState
      icon={PackageX}
      title="Inventory is turned off"
      description={canChange ? "Turn it on in Settings to track stock, record purchases and get low-stock alerts." : "Ask a super admin to turn on Inventory in Settings."}
      action={canChange ? <Button asChild><Link href="/admin/settings">Open Settings</Link></Button> : undefined}
    />
  );
}
