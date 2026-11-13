import { PageLoading, PanelSkeleton, SkeletonHeader } from "@/components/layout/page-skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading custom print">
      <SkeletonHeader {...PAGE_COPY.customPrint} />
      <div className="max-w-2xl">
        <PanelSkeleton lines={4} />
      </div>
    </PageLoading>
  );
}
