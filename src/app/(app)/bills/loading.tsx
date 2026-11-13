import { PageLoading, PagerSkeleton, SkeletonHeader, TableSkeleton, ToolbarSkeleton } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading bill history">
      <SkeletonHeader {...PAGE_COPY.bills} actions={["w-24"]} />
      <ToolbarSkeleton items={["w-72", "w-40", "w-40", "w-36"]} />
      <TableSkeleton columns={6} rows={8} />
      <PagerSkeleton />
    </PageLoading>
  );
}
