import { PageLoading, PagerSkeleton, SkeletonHeader, TableSkeleton, ToolbarSkeleton } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading audit log">
      <SkeletonHeader {...PAGE_COPY.auditLog} />
      <ToolbarSkeleton items={["w-44", "w-44", "w-40", "w-40", "w-40"]} />
      <TableSkeleton columns={5} rows={10} />
      <PagerSkeleton />
    </PageLoading>
  );
}
