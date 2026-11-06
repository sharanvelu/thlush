import { PageLoading, SkeletonHeader } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_COPY } from "@/config/page-copy";

export default function Loading() {
  return (
    <PageLoading label="Loading categories">
      <SkeletonHeader {...PAGE_COPY.categories} actions={["w-32"]} />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PageLoading>
  );
}
