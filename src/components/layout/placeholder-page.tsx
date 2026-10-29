import { Hammer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { findNavItem } from "@/config/navigation";
import { requireAccess } from "@/services/AuthService";

/**
 * Stand-in for a page that ships in a later milestone. It still enforces the
 * route's permission, so navigation and access control can be reviewed now.
 */
export async function PlaceholderPage({ href }: { href: string }) {
  const item = findNavItem(href);
  if (!item) notFound();

  const { allowed } = await requireAccess(item.permission);
  if (!allowed) return <Forbidden />;

  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <EmptyState
        icon={Hammer}
        title={`${item.label} arrives in milestone ${item.milestone}`}
        description="The navigation, permissions and layout for this page are already in place. The feature itself is built in a later milestone."
        action={
          item.href === "/" ? undefined : (
            <Button asChild variant="outline">
              <Link href="/">Back to dashboard</Link>
            </Button>
          )
        }
      />
    </>
  );
}
