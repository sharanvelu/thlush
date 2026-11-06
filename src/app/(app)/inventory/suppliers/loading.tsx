import { PageLoading, PagerSkeleton, SkeletonHeader, TableSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading suppliers and purchases">
      <SkeletonHeader {...PAGE_COPY.suppliers} actions={["w-32", "w-32"]} />
      <Skeleton className="mb-4 h-9 w-48 rounded-lg" />
      <TableSkeleton columns={5} rows={8} />
      <PagerSkeleton />
    </PageLoading>
  );
}
