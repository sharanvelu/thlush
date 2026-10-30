import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading customers">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-56" /></div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="mb-4 flex gap-2"><Skeleton className="h-8 w-72" /><Skeleton className="h-8 w-52" /></div>
      <div className="overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-40" /><Skeleton className="ml-auto h-4 w-16" /><Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
