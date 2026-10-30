"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyChart } from "@/components/dashboard/chart-card";
import { formatMoney, D } from "@/lib/money";
import type { DashboardData } from "@/services/DashboardService";

interface Format {
  currency: string;
  locale: string;
}

const AXIS = { fill: "var(--muted-foreground)", fontSize: 12 };
const FALLBACK = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

const dayLabel = (day: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

function Tip({ active, label, rows }: { active?: boolean; label?: string; rows: Array<[string, string]> }) {
  if (!active) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {rows.map(([name, value]) => (
        <p key={name} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{name}</span>
          <span className="tabular-nums">{value}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ series, ...fmt }: Format & { series: DashboardData["revenueSeries"] }) {
  const data = series.points.map((p) => ({
    label: series.granularity === "hour" ? hourLabel(Number(p.key)) : dayLabel(p.key, fmt.locale),
    revenue: Number(p.revenue),
    bills: p.bills,
  }));
  if (data.every((d) => d.revenue === 0)) return <EmptyChart>No sales in this period yet.</EmptyChart>;
  const compact = new Intl.NumberFormat(fmt.locale, { notation: "compact", maximumFractionDigits: 1 });
  const money = (v: number) => formatMoney(v, fmt);
  return (
    <>
      <div className="h-64 w-full" role="img" aria-label={`Revenue by ${series.granularity}. Full figures are in the table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => compact.format(v)} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, label, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                return <Tip active={active} label={String(label ?? "")} rows={p ? [["Revenue", money(p.revenue)], ["Bills", String(p.bills)]] : []} />;
              }}
            />
            <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#revenueFill)" isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Revenue and bills by {series.granularity}</caption>
        <thead><tr><th>{series.granularity === "hour" ? "Hour" : "Day"}</th><th>Revenue</th><th>Bills</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{money(d.revenue)}</td><td>{d.bills}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export function HoursChart({ hours, locale }: { hours: DashboardData["billsPerHour"]; locale: string }) {
  if (hours.every((h) => h.bills === 0)) return <EmptyChart>No bills in this period yet.</EmptyChart>;
  const data = hours.map((h) => ({ label: hourLabel(h.hour), bills: h.bills }));
  const peak = hours.reduce((a, b) => (b.bills > a.bills ? b : a));
  void locale;
  return (
    <>
      <div className="h-64 w-full" role="img" aria-label={`Bills per hour. Busiest hour is ${hourLabel(peak.hour)} with ${peak.bills} bills.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={({ active, label, payload }) => <Tip active={active} label={String(label ?? "")} rows={[["Bills", String(payload?.[0]?.value ?? 0)]]} />} />
            <Bar dataKey="bills" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Bills per hour</caption>
        <thead><tr><th>Hour</th><th>Bills</th></tr></thead>
        <tbody>{data.filter((d) => d.bills > 0).map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.bills}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export function CategoryDonut({ slices, total, ...fmt }: Format & { slices: DashboardData["salesByCategory"]; total: string }) {
  if (slices.length === 0) return <EmptyChart>No sales in this period yet.</EmptyChart>;
  const money = (v: string | number) => formatMoney(v, fmt);
  const sum = new D(total);
  const rows = slices.map((s, i) => ({
    ...s,
    amount: Number(s.value),
    // A category keeps its own colour; the rest take the theme's chart colours in a fixed order.
    fill: s.name === "Other" ? "var(--muted-foreground)" : (s.color ?? FALLBACK[i % FALLBACK.length]!),
    share: sum.isZero() ? 0 : new D(s.value).div(sum).times(100).toDecimalPlaces(1).toNumber(),
  }));
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-48 w-48 shrink-0" role="img" aria-label="Sales by category. Shares are listed beside the chart.">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="96%" paddingAngle={1.5} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.name} fill={r.fill} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              return <Tip active={active} label={p?.name} rows={p ? [["Sales", money(p.amount)], ["Share", `${p.share}%`]] : []} />;
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-semibold tabular-nums">{money(total)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: r.fill }} />
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="tabular-nums text-muted-foreground">{r.share}%</span>
            <span className="w-28 shrink-0 text-right tabular-nums">{money(r.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
