'use client';

import {useEffect, useState} from "react";
import {TodayStats as TypeTodayStats, OverallStats as TypeOverallStats, BillWithCustomer as TypeBillWithCustomer} from "@/types/billing";
import {ApiResponse as TypeApiResponse, PaginatedResponse as TypePaginatedResponse, ErrorResponse as TypeErrorResponse} from "@/types/global";
import Link from "next/link";
import {Config} from "@/config";

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

    const response: Response = await fetch('/api/billing/history?page=1&per_page=5');
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="m-0 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Welcome to {applicationName} Billing</p>
        </div>

        {/* Today's Stats */}
        <div className="mb-8">
          <h2 className="m-0 mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Today</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isStatsLoading ? (
              Array.from({length: 4}).map((_, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5 animate-pulse">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bills</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{todayStats?.total_bills ?? 0}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Revenue</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    ₹{todayStats?.total_revenue.toFixed(2) ?? '0.00'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Order</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    ₹{todayStats?.avg_order_value.toFixed(2) ?? '0.00'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Items Sold</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{todayStats?.total_items ?? 0}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Overall Stats */}
        <div className="mb-8">
          <h2 className="m-0 mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Overall</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isStatsLoading ? (
              Array.from({length: 4}).map((_, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5 animate-pulse">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Bills</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{overallStats?.total_bills ?? 0}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Revenue</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    ₹{overallStats?.total_revenue.toFixed(2) ?? '0.00'}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Menu Items</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{overallStats?.total_menu_items ?? 0}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Categories</div>
                  <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{overallStats?.total_categories ?? 0}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="m-0 mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/billing"
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5 hover:border-[#ffb347] transition no-underline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg -bg-linear-120 from-[#ff7a18] to-[#ffb347]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">New Bill</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Create a billing</div>
              </div>
            </Link>

            <Link
              href="/menu"
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5 hover:border-[#ffb347] transition no-underline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-120 from-[#28a745] to-[#20c997]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4v16m8-8H4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Menu Items</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Manage menu</div>
              </div>
            </Link>

            <Link
              href="/categories"
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5 hover:border-[#ffb347] transition no-underline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-120 from-[#6f42c1] to-[#b37feb]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16M4 18h7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Categories</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Manage categories</div>
              </div>
            </Link>

            <Link
              href="/billing/history"
              className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-5 hover:border-[#ffb347] transition no-underline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-linear-120 from-[#007bff] to-[#6cb4ee]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">History</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">View past bills</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Bills */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="m-0 text-lg font-semibold text-gray-700 dark:text-gray-300">Recent Bills</h2>
            <Link href="/billing/history" className="text-sm font-medium text-[#ff7a18] hover:underline no-underline">
              View all
            </Link>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl overflow-hidden">
            {isBillsLoading ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({length: 5}).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                    <div className="flex flex-col gap-2">
                      <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recentBills.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No bills yet. Start by creating your first bill!
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentBills.map((bill: TypeBillWithCustomer) => (
                  <div key={bill.id} className="flex items-center justify-between p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        #{bill.id} &middot; {formatDate(bill.created_at)}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {bill.customers?.name || 'Walk-in Customer'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {bill.bill_items?.length ?? 0} item{(bill.bill_items?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      {bill.currency} {bill.total_amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
