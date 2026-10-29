import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Call to action, usually a button or link. */
  action?: ReactNode;
  className?: string;
}

/** A friendly placeholder for lists and pages that have nothing to show yet. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center shadow-card",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-balance text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
