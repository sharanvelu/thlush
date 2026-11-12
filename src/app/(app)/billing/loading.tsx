import { Skeleton } from "@/components/ui/skeleton";

/** Same split as the POS screen: items on the left, the bill on the right once there is room for both. */
export default function Loading() {
  return (
    <div className="@container/pos" aria-busy="true" aria-label="Loading billing screen">
      <h1 className="sr-only">New bill</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 @min-[1000px]/pos:h-[calc(100dvh-8.25rem)] @min-[1000px]/pos:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-h-0 flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 @min-[560px]/pos:grid-cols-2 @min-[760px]/pos:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
        <aside className="hidden min-h-0 @min-[1000px]/pos:block">
          <Skeleton className="size-full min-h-96 rounded-xl" />
        </aside>
      </div>
    </div>
  );
}
