import { PageLoading, PanelSkeleton, SkeletonHeader } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading profile">
      <SkeletonHeader {...PAGE_COPY.profile} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton lines={3} />
        <PanelSkeleton lines={3} />
      </div>
    </PageLoading>
  );
}
