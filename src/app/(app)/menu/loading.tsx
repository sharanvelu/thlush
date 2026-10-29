import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading menu">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
            <Skeleton className="size-4" />
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
