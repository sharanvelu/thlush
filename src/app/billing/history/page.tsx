'use client';

import {useEffect, useState} from "react";
import {BillWithCustomer as TypeBillWithCustomer, BillItem as TypeBillItem, TodayStats as TypeTodayStats, OverallStats as TypeOverallStats} from "@/types/billing";
import {Pagination as TypePagination, PaginatedResponse as TypePaginatedResponse, ErrorResponse as TypeErrorResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import Loader from "@/components/Loader";
import {shouldIgnoreTax} from "@/helpers";

export default function BillingHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<TypeBillWithCustomer[]>([]);
  const [pagination, setPagination] = useState<TypePagination | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);
  const [todayStats, setTodayStats] = useState<TypeTodayStats | null>(null);
  const [overallStats, setOverallStats] = useState<TypeOverallStats | null>(null);

  async function fetchBills(page: number = 1): Promise<void> {
    setIsLoading(true);

    const response: Response = await fetch(`/api/billing/history?page=${page}&per_page=10`);
    const data: TypePaginatedResponse<TypeBillWithCustomer> | TypeErrorResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch billing history');
    }

    setBills(data.data);
    setPagination(data.pagination ?? null);
    setIsLoading(false);
  }

  async function fetchStats(): Promise<void> {
    const [todayRes, overallRes] = await Promise.all([
      fetch('/api/billing/stats/today'),
      fetch('/api/billing/stats/overall'),
    ]);

    const todayData: TypeApiResponse<TypeTodayStats> = await todayRes.json();
    const overallData: TypeApiResponse<TypeOverallStats> = await overallRes.json();

    if (todayData.success) setTodayStats(todayData.data);
    if (overallData.success) setOverallStats(overallData.data);
  }

  useEffect(() => {
    fetchBills().then(r => console.log(r));
    fetchStats().then(r => console.log(r));
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

  const toggleExpand = (billId: number) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  if (isLoading) {
    return <Loader/>;
  }

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
          <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Billing History
          </h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today&apos;s Bills</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{todayStats?.total_bills ?? '-'}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Today&apos;s Revenue</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats ? `₹${todayStats.total_revenue.toFixed(2)}` : '-'}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avg Order Value</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {todayStats ? `₹${todayStats.avg_order_value.toFixed(2)}` : '-'}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Items Sold Today</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{todayStats?.total_items ?? '-'}</div>
            </div>
            <div className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overall Bills</div>
              <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{overallStats?.total_bills ?? '-'}</div>
            </div>
          </div>

          {bills.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400">No bills found.</p>
          )}

          <div className="flex flex-col gap-4">
            {bills.map((bill: TypeBillWithCustomer) => (
              <div
                key={bill.id}
                className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl overflow-hidden"
              >
                {/* Bill header - clickable */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  onClick={() => toggleExpand(bill.id)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      #{bill.id} &middot; {formatDate(bill.created_at)}
                    </span>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      {bill.thlush_customers?.name || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {bill.currency} {bill.total_amount.toFixed(2)}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedBillId === bill.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </div>

                {/* Bill items - expandable */}
                {expandedBillId === bill.id && (
                  <div className="border-t-2 border-[#f0e6dd] dark:border-gray-700 p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-2 font-medium">Item</th>
                          <th className="pb-2 font-medium text-right">Qty</th>
                          <th className="pb-2 font-medium text-right">Price</th>
                          {!shouldIgnoreTax() && (
                            <th className="pb-2 font-medium text-right">Tax</th>
                          )}
                          <th className="pb-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bill.thlush_bill_items.map((item: TypeBillItem) => (
                          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 text-gray-900 dark:text-white">{item.name}</td>
                            <td className="py-2 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                            <td className="py-2 text-right text-gray-600 dark:text-gray-300">{item.price.toFixed(2)}</td>
                            {!shouldIgnoreTax() && (
                              <td className="py-2 text-right text-gray-600 dark:text-gray-300">
                                {((item.sgst + item.cgst) * item.price * item.quantity / 100).toFixed(2)}
                              </td>
                            )}
                            <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Bill summary */}
                    <div className="flex justify-end mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-right text-sm space-y-1">
                        {!shouldIgnoreTax() && (
                          <div className="text-gray-500 dark:text-gray-400">
                            Tax: {bill.currency} {bill.total_tax.toFixed(2)}
                          </div>
                        )}
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          Total: {bill.currency} {bill.total_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm font-medium rounded-xl border-2 border-[#f0e6dd] dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                disabled={!pagination.has_prev_page}
                onClick={() => fetchBills(pagination.current_page - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <button
                className="px-4 py-2 text-sm font-medium rounded-xl border-2 border-[#f0e6dd] dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                disabled={!pagination.has_next_page}
                onClick={() => fetchBills(pagination.current_page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
