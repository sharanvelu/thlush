import { PageLoading, SkeletonHeader, TableSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading reports">
      <SkeletonHeader {...PAGE_COPY.reports} actions={["w-72"]} />
      <div className="-mx-1 mb-6 flex gap-1 overflow-hidden px-1 pb-1">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mb-6 space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <TableSkeleton columns={6} rows={7} />
    </PageLoading>
  );
}
