import { PageLoading, PanelSkeleton, TableSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageLoading label="Loading user">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="sr-only">User</h1>
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <PanelSkeleton lines={4} className="lg:col-span-1" />
        <div className="lg:col-span-2">
          <TableSkeleton columns={4} rows={6} />
        </div>
      </div>
    </PageLoading>
  );
}
