'use client';

import {useEffect, useState} from "react";
import Link from "next/link";
import {TodayStats as TypeTodayStats, OverallStats as TypeOverallStats, BillWithCustomer as TypeBillWithCustomer} from "@/types/billing";
import {ApiResponse as TypeApiResponse, PaginatedResponse as TypePaginatedResponse, ErrorResponse as TypeErrorResponse} from "@/types/global";
import {Config} from "@/config";
import PageHeader from "@/components/PageHeader";
import Icon, {IconName} from "@/components/Icon";

const QUICK_ACTIONS: { href: string; label: string; hint: string; icon: IconName }[] = [
  {href: '/billing', label: 'New bill', hint: 'Open the counter', icon: 'receipt'},
  {href: '/menu', label: 'Menu items', hint: 'Prices and tax', icon: 'utensils'},
  {href: '/categories', label: 'Categories', hint: 'Organise the menu', icon: 'tag'},
  {href: '/billing/history', label: 'History', hint: 'Past bills', icon: 'history'},
];

export default function DashboardPage() {
  const applicationName: string = Config.app_name;

  const [todayStats, setTodayStats] = useState<TypeTodayStats | null>(null);
  const [overallStats, setOverallStats] = useState<TypeOverallStats | null>(null);
  const [recentBills, setRecentBills] = useState<TypeBillWithCustomer[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isBillsLoading, setIsBillsLoading] = useState(true);

  async function fetchStats(): Promise<void> {
    setIsStatsLoading(true);

    const [todayRes, overallRes] = await Promise.all([
      fetch('/api/billing/stats/today'),
      fetch('/api/billing/stats/overall'),
    ]);

    const todayData: TypeApiResponse<TypeTodayStats> = await todayRes.json();
    const overallData: TypeApiResponse<TypeOverallStats> = await overallRes.json();

    if (todayData.success) setTodayStats(todayData.data);
    if (overallData.success) setOverallStats(overallData.data);
    setIsStatsLoading(false);
  }

  async function fetchRecentBills(): Promise<void> {
    setIsBillsLoading(true);

    const response: Response = await fetch('/api/billing/history?page=1&per_page=6');
    const data: TypePaginatedResponse<TypeBillWithCustomer> | TypeErrorResponse = await response.json();

    if (data.success) {
      setRecentBills(data.data);
    }
    setIsBillsLoading(false);
  }

  useEffect(() => {
    fetchStats().then(r => console.log(r));
    fetchRecentBills().then(r => console.log(r));
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const today: string = new Date().toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long'});

  const secondary: { label: string; value: string; icon: IconName }[] = [
    {label: 'Bills today', value: String(todayStats?.total_bills ?? 0), icon: 'receipt'},
    {label: 'Avg order', value: `₹${(todayStats?.avg_order_value ?? 0).toFixed(2)}`, icon: 'trend'},
    {label: 'Items sold', value: String(todayStats?.total_items ?? 0), icon: 'box'},
  ];

  const overall: { label: string; value: string }[] = [
    {label: 'Total bills', value: String(overallStats?.total_bills ?? 0)},
    {label: 'Total revenue', value: `₹${(overallStats?.total_revenue ?? 0).toFixed(2)}`},
    {label: 'Menu items', value: String(overallStats?.total_menu_items ?? 0)},
    {label: 'Categories', value: String(overallStats?.total_categories ?? 0)},
  ];

  return (
    <div className="rise">
      <PageHeader
        title="Dashboard"
        description={`${today} · ${applicationName} counter`}
      />

      {/* Today: the focal point is revenue — big, mono, on a receipt-paper card */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="card card-pad relative flex flex-col overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Today&apos;s revenue</span>
            <span className="badge badge-accent badge-dot">Live</span>
          </div>
          {isStatsLoading ? (
            <div className="skeleton mt-4 h-14 w-56"/>
          ) : (
            <div className="num mt-3 text-[56px] font-medium leading-[1.05] tracking-[-0.04em] text-ink">
              <span className="mr-1 text-[32px] text-ink-3">₹</span>
              {(todayStats?.total_revenue ?? 0).toFixed(2)}
            </div>
          )}
          <div className="min-h-5 flex-1"/>
          <hr className="rule-dash mb-5"/>
          <div className="grid grid-cols-3 gap-4">
            {secondary.map((s) => (
              <div key={s.label}>
                <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Icon name={s.icon} size={13}/> {s.label}
                </div>
                {isStatsLoading ? (
                  <div className="skeleton mt-2 h-6 w-16"/>
                ) : (
                  <div className="num mt-1 text-[20px] font-semibold tracking-[-0.02em]">{s.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className={`card group flex flex-col justify-between p-4 transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-pop ${i === 0 ? 'bg-accent-soft' : ''}`}
            >
              <div className={`grid size-8 place-items-center rounded-lg ${i === 0 ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink-2'}`}>
                <Icon name={a.icon} size={16}/>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  {a.label}
                  <Icon name="arrowRight" size={14} className="text-ink-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink-2"/>
                </div>
                <div className="text-[12px] text-ink-3">{a.hint}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Overall: quiet inline strip, deliberately lower tier */}
      <section className="mt-4 card">
        <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          {overall.map((o) => (
            <div key={o.label} className="px-5 py-4">
              <div className="eyebrow">{o.label}</div>
              {isStatsLoading ? (
                <div className="skeleton mt-2 h-6 w-20"/>
              ) : (
                <div className="num mt-1 text-[18px] font-semibold tracking-[-0.02em]">{o.value}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent bills */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Recent bills</h2>
          <Link href="/billing/history" className="flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
            View all <Icon name="chevronRight" size={14}/>
          </Link>
        </div>
        <div className="card overflow-hidden">
          {isBillsLoading ? (
            Array.from({length: 5}).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-line p-4 last:border-0">
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-3 w-32"/>
                  <div className="skeleton h-4 w-40"/>
                </div>
                <div className="skeleton h-5 w-20"/>
              </div>
            ))
          ) : recentBills.length === 0 ? (
            <div className="empty">
              <div className="grid size-10 place-items-center rounded-full bg-sunken"><Icon name="receipt" size={18}/></div>
              <div className="text-[14px] font-medium text-ink">No bills yet</div>
              <div className="text-[13px]">Ring up your first order to see it here.</div>
              <Link href="/billing" className="btn btn-primary btn-sm mt-2">Create a bill</Link>
            </div>
          ) : (
            recentBills.map((bill: TypeBillWithCustomer) => (
              <Link
                key={bill.id}
                href="/billing/history"
                className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 transition-colors duration-150 last:border-0 hover:bg-sunken"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="num grid h-9 min-w-9 place-items-center rounded-lg bg-sunken px-2 text-[12px] text-ink-2">#{bill.id}</div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{bill.customers?.name || 'Walk-in Customer'}</div>
                    <div className="text-[12px] text-ink-3">
                      {formatDate(bill.created_at)} · {bill.bill_items?.length ?? 0} item{(bill.bill_items?.length ?? 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <span className="num text-[14px] font-semibold">{bill.currency} {bill.total_amount.toFixed(2)}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
