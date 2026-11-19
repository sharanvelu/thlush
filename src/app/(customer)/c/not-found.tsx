import Link from "next/link";
import { getCustomerBrand } from "@/lib/customer-brand";

/** The customer site's own 404. Deliberately plain: nothing here hints at the staff app. */
export default async function CustomerNotFound() {
  const brand = await getCustomerBrand();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-7xl font-semibold tracking-tight text-primary/80 tabular-nums">404</p>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="text-muted-foreground">The link may be wrong or out of date.</p>
      </div>
      <Link
        href="/"
        className="mt-1 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none"
      >
        Back to {brand.name}
      </Link>
    </main>
  );
}
