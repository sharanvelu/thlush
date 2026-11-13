import { PageLoading, PagerSkeleton, SkeletonHeader, TableSkeleton, ToolbarSkeleton } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading menu">
      <SkeletonHeader {...PAGE_COPY.menu} actions={["w-24", "w-24", "w-28"]} />
      <ToolbarSkeleton items={["w-64", "w-44", "w-48"]} />
      <TableSkeleton columns={5} rows={8} />
      <PagerSkeleton />
    </PageLoading>
  );
}
