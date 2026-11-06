import { CardsSkeleton, PageLoading, PagerSkeleton, SkeletonHeader, TableSkeleton, ToolbarSkeleton } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading stock">
      <SkeletonHeader {...PAGE_COPY.stock} actions={["w-28"]} />
      <CardsSkeleton />
      <ToolbarSkeleton items={["w-64", "w-44", "w-56", "w-48"]} />
      <TableSkeleton columns={6} rows={8} />
      <PagerSkeleton />
    </PageLoading>
  );
}
