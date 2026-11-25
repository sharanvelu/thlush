"use client";

import { ChevronLeft, ChevronRight, MessageSquareHeart, Search, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_COPY } from "@/config/page-copy";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FeedbackListQuery } from "@/lib/validation/feedback";
import type { FeedbackRow, FeedbackSummary } from "@/services/FeedbackService";

interface FeedbackViewProps {
  rows: FeedbackRow[];
  total: number;
  summary: FeedbackSummary;
  query: FeedbackListQuery;
  /** False when the feature is switched off in Settings: old feedback stays readable. */
  enabled: boolean;
  locale: { locale: string; timezone: string };
}

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${label}: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-3.5", n <= value ? "fill-warning text-warning" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

const avgText = (v: number | null) => (v === null ? "No ratings yet" : v.toFixed(1));

export function FeedbackView({ rows, total, summary, query, enabled, locale }: FeedbackViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const debounced = useDebouncedValue(search, 300);

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const next = debounced.trim();
    if (next !== (query.q ?? "")) setParams({ q: next || null });
    // Only the typed text should trigger this, not the URL echoing it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const stats: Array<{ label: string; value: string }> = [
    { label: "Responses", value: String(summary.responses) },
    { label: "Order", value: avgText(summary.overall) },
    { label: "Ambience", value: avgText(summary.ambience) },
    { label: "Service", value: avgText(summary.service) },
    { label: "Experience", value: avgText(summary.experience) },
    { label: "Would recommend", value: summary.recommendPct === null ? "No answers yet" : `${summary.recommendPct}%` },
  ];

  return (
    <>
      <PageHeader title={PAGE_COPY.feedback.title} description={PAGE_COPY.feedback.description} />

      {!enabled ? (
        <p className="mb-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-foreground">
          Customer feedback is turned off in Settings, so no new links can be made. Feedback already received is below.
        </p>
      ) : null}

      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3 shadow-card">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-3 mb-6 text-xs text-muted-foreground">Averages are out of 5 stars, for the filters below.</p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search by bill number"
            placeholder="Search by bill number"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={query.range ?? "30d"} onValueChange={(v) => setParams({ range: v === "30d" ? null : v })}>
          <SelectTrigger aria-label="Period" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={query.rating ? String(query.rating) : "all"}
          onValueChange={(v) => setParams({ rating: v === "all" ? null : v })}
        >
          <SelectTrigger aria-label="Order rating" className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any order rating</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {n === 1 ? "star" : "stars"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareHeart}
          title="No feedback yet"
          description={
            query.q || query.rating || query.range
              ? "Nothing matches these filters."
              : "After a bill is saved, press Get feedback and have the customer scan the QR code."
          }
        />
      ) : (
        <ul className={cn("flex flex-col gap-3", isPending && "opacity-70")} aria-busy={isPending}>
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <Link href={`/receipt/${r.billId}`} className="font-semibold hover:underline">
                  {r.billNo}
                </Link>
                <span className="text-xs text-muted-foreground">{formatDateTime(r.submittedAt, locale)}</span>
              </div>
              {r.contact ? <p className="text-sm text-muted-foreground">{r.contact}</p> : null}

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                {[
                  ["Order", r.overall],
                  ["Ambience", r.ambience],
                  ["Service", r.service],
                  ["Experience", r.experience],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd>
                      <Stars value={value as number} label={label as string} />
                    </dd>
                  </div>
                ))}
              </dl>

              {r.wouldRecommend !== null ? (
                <p className="mt-2 text-sm">
                  Would recommend: <span className="font-medium">{r.wouldRecommend ? "Yes" : "No"}</span>
                </p>
              ) : null}
              {r.comment ? <p className="mt-2 text-sm whitespace-pre-wrap">{r.comment}</p> : null}

              {r.items.length > 0 ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {r.items.length} {r.items.length === 1 ? "item" : "items"} rated
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {r.items.map((i, idx) => (
                      <li key={idx} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="min-w-0 font-medium">{i.name}</span>
                        <Stars value={i.rating} label={i.name} />
                        {i.comment ? <span className="text-muted-foreground">{i.comment}</span> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between" aria-label="Pages">
          <p className="text-sm text-muted-foreground">
            Page {query.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page <= 1}
              onClick={() => setParams({ page: String(query.page - 1) }, false)}
            >
              <ChevronLeft aria-hidden /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page >= totalPages}
              onClick={() => setParams({ page: String(query.page + 1) }, false)}
            >
              Next <ChevronRight aria-hidden />
            </Button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
