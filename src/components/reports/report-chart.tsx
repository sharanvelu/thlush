"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyChart } from "@/components/dashboard/chart-card";
import { formatMoney } from "@/lib/money";
import type { ReportData } from "@/lib/reports";

const AXIS = { fill: "var(--muted-foreground)", fontSize: 12 };
const TOP = 10;

interface ReportChartProps {
  report: ReportData;
  currency: string;
  locale: string;
}

/** One series, drawn from the same numbers as the table below it. */
export function ReportChart({ report, currency, locale }: ReportChartProps) {
  const chart = report.chart;
  if (!chart) return null;

  const source = report.chartRows ?? report.rows;
  const rows = chart.type === "bar" ? source.slice(0, TOP) : source;
  const data = rows.map((r) => ({ label: r[chart.labelKey] ?? "", value: Number(r[chart.valueKey] ?? 0) }));
  if (data.length === 0 || data.every((d) => d.value === 0)) return <EmptyChart>Nothing to chart for this period.</EmptyChart>;

  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const show = (v: number) => (chart.format === "money" ? formatMoney(v, { currency, locale }) : new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(v));
  const summary = `${chart.valueLabel} by ${report.columns.find((c) => c.key === chart.labelKey)?.label.toLowerCase() ?? "row"}. The full figures are in the table below.`;

  const tooltip = ({ active, label, payload }: { active?: boolean; label?: string | number; payload?: ReadonlyArray<{ value?: unknown }> }) =>
    active && payload?.[0] ? (
      <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
        <p className="mb-1 font-medium">{String(label ?? "")}</p>
        <p className="flex justify-between gap-4">
          <span className="text-muted-foreground">{chart.valueLabel}</span>
          <span className="tabular-nums">{show(Number(payload[0].value))}</span>
        </p>
      </div>
    ) : null;

  if (chart.type === "area") {
    return (
      <div className="h-64 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={32} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
            <Tooltip cursor={{ stroke: "var(--border)" }} content={tooltip} />
            <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} fill="url(#reportFill)" isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Horizontal bars keep long names readable.
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 34 + 24) }} role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => compact.format(v)} />
          <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={120} tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={tooltip} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
