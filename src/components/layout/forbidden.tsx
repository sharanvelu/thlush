import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

/** Shown when a signed-in user opens something their role cannot access. */
export function Forbidden() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this page"
      description="Your role doesn't include this area. If you think that's a mistake, ask a super admin to update your role."
      action={
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
