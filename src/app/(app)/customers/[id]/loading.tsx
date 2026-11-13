import { CardsSkeleton, PageLoading, TableSkeleton } from "@/components/layout/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageLoading label="Loading customer">
      <header className="mb-6 space-y-2">
        <h1 className="sr-only">Customer</h1>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </header>
      <CardsSkeleton count={3} className="xl:grid-cols-3" />
      <TableSkeleton columns={5} rows={6} />
    </PageLoading>
  );
}
