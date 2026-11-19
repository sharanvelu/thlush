import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/customer/brand-mark";
import { getCustomerBrand } from "@/lib/customer-brand";

export const metadata: Metadata = { title: "Welcome" };

// The logo and name come from Settings, so read them per request rather than at build time.
export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const brand = await getCustomerBrand();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 p-6 text-center">
      <BrandMark logoSrc={brand.logoSrc} name={brand.name} className="size-24" />
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{brand.name}</h1>
        <p className="text-muted-foreground">Welcome! Take a look at what we serve.</p>
      </div>
      <Link
        href="/menu"
        className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transition-none"
      >
        View the menu
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </Link>
    </main>
  );
}
