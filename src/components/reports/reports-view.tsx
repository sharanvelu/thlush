"use client";

import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ReportChart } from "@/components/reports/report-chart";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ResolvedRange } from "@/lib/dashboard";
import { GROUPS, REPORT_META, formatCell, type Group, type ReportData, type ReportKind } from "@/lib/reports";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<Group, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

interface ReportsViewProps {
  report: ReportData;
  kinds: ReportKind[];
  group: Group;
  range: ResolvedRange;
  today: string;
  settings: { currency: string; locale: string };
}

export function ReportsView({ report, kinds, group, range, today, settings }: ReportsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const meta = REPORT_META[report.kind];

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const exportHref = (format: "csv" | "pdf") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("r", report.kind);
    params.set("format", format);
    return `/api/reports/export?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales, tax, discounts and stock, with the same figures in the table, the chart and the export."
        actions={meta.usesRange ? <RangeSelector range={range} today={today} defaultKey="30d" /> : null}
      />

      <nav aria-label="Report type" className="-mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
        {kinds.map((k) => {
          const selected = k === report.kind;
          return (
            <Button
              key={k}
              aria-pressed={selected}
              variant={selected ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => setParam("r", k === "sales" ? null : k)}
            >
              {REPORT_META[k].label}
            </Button>
          );
        })}
      </nav>

      <section aria-labelledby="report-title" className={cn("space-y-6 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="report-title" className="text-lg font-semibold">{report.title}</h2>
            <p className="text-sm text-muted-foreground">
              {report.description}
              {report.period ? ` ${report.period}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.kind === "sales" ? (
              <ToggleGroup type="single" variant="outline" size="sm" value={group} onValueChange={(v) => v && setParam("group", v === "day" ? null : v)} aria-label="Group by">
                {GROUPS.map((g) => (
                  <ToggleGroupItem key={g} value={g}>{GROUP_LABELS[g]}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <a href={exportHref("csv")} download><FileSpreadsheet aria-hidden /> CSV</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={exportHref("pdf")} download><FileText aria-hidden /> PDF</a>
            </Button>
          </div>
        </div>

        {report.rows.length === 0 ? (
          <EmptyState icon={Download} title="No data for this period" description={meta.usesRange ? "Try a wider date range." : "Nothing to show yet."} />
        ) : (
          <>
            {report.chart ? (
              <ChartCard title={report.chart.valueLabel} description={report.chart.type === "bar" && report.rows.length > 10 ? "Top 10 shown. The table lists everything." : undefined}>
                <ReportChart report={report} {...settings} />
              </ChartCard>
            ) : null}

            <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {report.columns.map((c) => (
                      <TableHead key={c.key} className={cn(c.format !== "text" && "text-right")}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((r, i) => (
                    <TableRow key={i}>
                      {report.columns.map((c, ci) => (
                        <TableCell key={c.key} className={cn(c.format !== "text" && "text-right tabular-nums", ci === 0 && "font-medium")}>
                          {formatCell(r[c.key], c.format, settings)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                {report.totals ? (
                  <TableFooter>
                    <TableRow>
                      {report.columns.map((c, ci) => (
                        <TableCell key={c.key} className={cn("font-semibold", c.format !== "text" && "text-right tabular-nums")}>
                          {ci === 0 ? (report.totals?.[c.key] ?? "Total") : formatCell(report.totals?.[c.key], c.format, settings)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </div>
            {report.truncated ? <p className="text-sm text-muted-foreground">Only the first rows are listed. Narrow the date range to see the rest.</p> : null}
          </>
        )}
      </section>
    </>
  );
}
