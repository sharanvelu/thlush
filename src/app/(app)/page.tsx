import { FolderPlus, History, PackagePlus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryDonut, HoursChart, RevenueChart } from "@/components/dashboard/dashboard-charts";
import { Greeting } from "@/components/dashboard/greeting";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { LowStock, PaymentSplit, RecentBills, TopItems } from "@/components/dashboard/widgets";
import { Forbidden } from "@/components/layout/forbidden";
import { Button } from "@/components/ui/button";
import { hasPermission, type Permission } from "@/config/permissions";
import { todayIn } from "@/lib/dates";
import { resolveRange } from "@/lib/dashboard";
import { D, formatMoney } from "@/lib/money";
import { requireAccess } from "@/services/AuthService";
import { getDashboard } from "@/services/DashboardService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Dashboard" };

const QUICK_ACTIONS: Array<{ label: string; hint: string; href: string; icon: typeof ReceiptText; permission: Permission }> = [
  { label: "New Bill", hint: "Open the POS", href: "/billing", icon: ReceiptText, permission: "bills.create" },
  { label: "Add Menu Item", hint: "Create a product", href: "/menu?new=1", icon: PackagePlus, permission: "menu.manage" },
  { label: "Add Category", hint: "Organise the menu", href: "/categories?new=1", icon: FolderPlus, permission: "categories.manage" },
  { label: "View History", hint: "Past bills", href: "/bills", icon: History, permission: "bills.view_own" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { user, allowed } = await requireAccess("dashboard.view");
  if (!allowed) return <Forbidden />;

  const query = await searchParams;
  const settings = await getSettings();
  const { currency, locale, timezone } = settings.locale;
  const range = resolveRange(first(query.range), first(query.from), first(query.to), timezone);
  const data = await getDashboard(range, user, timezone);

  const fmt = { currency, locale };
  const money = (v: string) => formatMoney(v, fmt);
  const compared =
    range.key === "today" ? "vs yesterday" : `vs previous ${range.days} ${range.days === 1 ? "day" : "days"}`;
  const none = (k: { current: string; previous: string }) => new D(k.current).isZero() && new D(k.previous).isZero();
  const k = data.kpis;
  const actions = QUICK_ACTIONS.filter((a) => hasPermission(user.role, a.permission));
  const periodLabel =
    range.days === 1 ? "this day" : `${range.from} to ${range.to}`;

  const overall: Array<[string, string]> = [
    ["Total bills", data.overall.bills.toLocaleString(locale)],
    ["Total revenue", money(data.overall.revenue)],
    ["Menu items", data.overall.menuItems.toLocaleString(locale)],
    ["Categories", data.overall.categories.toLocaleString(locale)],
    ["Customers", data.overall.customers.toLocaleString(locale)],
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Greeting name={user.name} />
          {data.ownOnly ? <p className="mt-1 text-xs text-muted-foreground">Showing your own bills only.</p> : null}
        </div>
        <RangeSelector key={`${range.key}-${range.from}-${range.to}`} range={range} today={todayIn(timezone)} />
      </div>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">Key figures for {periodLabel}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Bills" value={Number(k.bills.current).toLocaleString(locale)} change={k.bills.change} quiet={none(k.bills)} comparedTo={compared} />
          <KpiCard label="Revenue" value={money(k.revenue.current)} change={k.revenue.change} quiet={none(k.revenue)} comparedTo={compared} />
          <KpiCard label="Average order value" value={money(k.averageOrder.current)} change={k.averageOrder.change} quiet={none(k.averageOrder)} comparedTo={compared} />
          <KpiCard label="Items sold" value={Number(k.itemsSold.current).toLocaleString(locale)} change={k.itemsSold.change} quiet={none(k.itemsSold)} comparedTo={compared} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Counts completed bills only. Voided, refunded and held bills are left out.</p>
      </section>

      <section aria-label="Overall totals">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {overall.map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card px-4 py-3 shadow-card">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 truncate text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Revenue" description={data.revenueSeries.granularity === "hour" ? "By hour of the day" : "By day"}>
          <RevenueChart series={data.revenueSeries} {...fmt} />
        </ChartCard>
        <ChartCard title="Sales by category" description="Share of revenue">
          <CategoryDonut slices={data.salesByCategory} total={k.revenue.current} {...fmt} />
        </ChartCard>
        <ChartCard className="xl:col-span-2" title="Bills per hour" description="When it gets busy">
          <HoursChart hours={data.billsPerHour} locale={locale} />
        </ChartCard>
        <ChartCard title="Payment methods" description="Share of money received">
          <PaymentSplit rows={data.paymentSplit} {...fmt} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Recent bills"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/bills">View all</Link>
            </Button>
          }
        >
          <RecentBills bills={data.recentBills} locale={locale} timeZone={timezone} walkIn={settings.billing.defaultCustomerName || "Walk-in Customer"} />
        </ChartCard>
        <div className="flex flex-col gap-4">
          <ChartCard title="Top 5 items" description="By quantity sold">
            <TopItems items={data.topItems} {...fmt} />
          </ChartCard>
          {data.lowStock ? (
            <ChartCard title="Low stock" description={data.lowStock.total > 0 ? `${data.lowStock.total} to reorder` : undefined}>
              <LowStock data={data.lowStock} />
            </ChartCard>
          ) : null}
        </div>
      </div>

      {actions.length > 0 ? (
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="mb-3 text-sm font-medium text-muted-foreground">Quick actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map(({ label, hint, href, icon: Icon }) => (
              <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-accent/50">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
