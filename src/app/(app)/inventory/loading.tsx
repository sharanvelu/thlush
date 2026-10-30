import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading inventory">
      <div className="mb-6 space-y-2"><Skeleton className="h-7 w-44" /><Skeleton className="h-4 w-72" /></div>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-44" /><Skeleton className="ml-auto h-4 w-16" /><Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
