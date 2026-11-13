import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-3 p-6" aria-busy="true" aria-label="Loading receipt">
      <h1 className="sr-only">Receipt</h1>
      <Skeleton className="mx-auto h-6 w-40" />
      <Skeleton className="mx-auto h-4 w-56" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
