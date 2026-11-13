import { PageLoading, PagerSkeleton, SkeletonHeader, TableSkeleton, ToolbarSkeleton } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading customers">
      <SkeletonHeader {...PAGE_COPY.customers} actions={["w-36"]} />
      <ToolbarSkeleton items={["w-72", "w-52"]} />
      <TableSkeleton columns={5} rows={8} />
      <PagerSkeleton />
    </PageLoading>
  );
}
