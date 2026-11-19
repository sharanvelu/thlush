import Link from "next/link";
import { appConfig } from "@/config";

/** The customer site's own 404. Deliberately plain: nothing here hints at the staff app. */
export default function CustomerNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">The link may be wrong or out of date.</p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Back to {appConfig.appName}
      </Link>
    </main>
  );
}
