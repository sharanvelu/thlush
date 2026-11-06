import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageCopy } from "@/config/page-copy";
import { cn } from "@/lib/utils";

/**
 * Building blocks for `loading.tsx`. They draw the real page title straight away (it is known without any
 * data) and grey placeholders only where data will land, so a page appears at once and fills in.
 */

interface PageLoadingProps {
  /** Announced to screen readers while the page loads. */
  label: string;
  children: ReactNode;
}

export function PageLoading({ label, children }: PageLoadingProps) {
  return (
    <div aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}

interface SkeletonHeaderProps extends Partial<PageCopy> {
  title: string;
  /** Widths (Tailwind classes) of placeholder buttons on the right. */
  actions?: string[];
}

export function SkeletonHeader({ title, description, actions = [] }: SkeletonHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : <Skeleton className="mt-2 h-4 w-64 max-w-full" />}
      </div>
      {actions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((w, i) => (
            <Skeleton key={i} className={cn("h-8 rounded-lg", w)} />
          ))}
        </div>
      ) : null}
    </header>
  );
}

/** A row of filter controls. */
export function ToolbarSkeleton({ items = ["w-64", "w-44"] }: { items?: string[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((w, i) => (
        <Skeleton key={i} className={cn("h-8 max-w-full", w)} />
      ))}
    </div>
  );
}

/** Summary cards. */
export function CardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

/** A table with a header row and `rows` rows of `columns` cells. The first cell is wider. */
export function TableSkeleton({ columns = 5, rows = 8, className }: { columns?: number; rows?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-card", className)}>
      <div className="flex items-center gap-4 border-b bg-muted/40 p-3">
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className={cn("h-3", c === 0 ? "w-28" : "ml-auto w-16")} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b p-4 last:border-b-0">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-40 max-w-[40%]" : "ml-auto w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A titled card with some lines inside, for forms and detail panels. */
export function PanelSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-4 rounded-xl border bg-card p-5 shadow-card", className)}>
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function PagerSkeleton() {
  return (
    <div className="mt-4 flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}
