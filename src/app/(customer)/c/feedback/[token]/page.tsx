import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/customer/brand-mark";
import { FeedbackForm } from "@/components/customer/feedback-form";
import { getEnv } from "@/env";
import { getCustomerBrand } from "@/lib/customer-brand";
import { feedbackSubmitPath } from "@/lib/feedback";
import { getFeedbackForm } from "@/services/FeedbackService";

// A private, one-off link: keep it out of search engines and out of any cache.
export const metadata: Metadata = { title: "Your feedback", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function FeedbackPage({ params }: PageProps<"/c/feedback/[token]">) {
  const { token } = await params;
  const [form, brand] = await Promise.all([getFeedbackForm(token), getCustomerBrand()]);
  if (!form) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 pb-16">
      <header className="flex flex-col items-center gap-2 pt-12 pb-6 text-center">
        <BrandMark logoSrc={brand.logoSrc} name={brand.name} className="size-16" />
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {form.state === "open" ? `How was your visit to ${brand.name}?` : brand.name}
        </h1>
        {form.state === "open" ? (
          <p className="text-sm text-muted-foreground">It takes about a minute. Bill {form.billNo}</p>
        ) : null}
      </header>

      {form.state === "open" ? (
        <FeedbackForm
          billNo={form.billNo}
          businessName={form.businessName}
          items={form.items}
          ask={form.ask}
          submitPath={feedbackSubmitPath(token, getEnv().APP_DOMAIN_CUSTOMER)}
        />
      ) : (
        <div role="status" className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <h2 className="text-xl font-semibold tracking-tight">
            {form.state === "submitted" ? "Thanks, we already have your feedback" : "This link has expired"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {form.state === "submitted"
              ? "Each bill can be reviewed once. We appreciate you taking the time."
              : "Feedback links work for 24 hours after the bill. Ask the staff if you would still like to share your thoughts."}
          </p>
        </div>
      )}
    </main>
  );
}
