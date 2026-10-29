import { Compass } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
      <EmptyState
        className="w-full"
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild>
            <Link href="/">Go to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
