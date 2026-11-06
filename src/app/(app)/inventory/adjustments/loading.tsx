import { PageLoading, PagerSkeleton, PanelSkeleton, SkeletonHeader, TableSkeleton, ToolbarSkeleton } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading stock adjustments">
      <SkeletonHeader {...PAGE_COPY.adjustments} />
      <PanelSkeleton lines={3} className="mb-6" />
      <ToolbarSkeleton items={["w-52", "w-40", "w-40", "w-40"]} />
      <TableSkeleton columns={6} rows={6} />
      <PagerSkeleton />
    </PageLoading>
  );
}
