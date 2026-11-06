import { PageLoading, PanelSkeleton, SkeletonHeader } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading settings">
      <SkeletonHeader {...PAGE_COPY.settings} />
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <PanelSkeleton key={i} lines={3} />
        ))}
      </div>
    </PageLoading>
  );
}
