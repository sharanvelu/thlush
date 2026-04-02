'use client';

import {useEffect, useState} from "react";
import {BillFilters as TypeBillFilters, BillSortBy, BillWithCustomer as TypeBillWithCustomer, BillItem as TypeBillItem, TodayStats as TypeTodayStats, OverallStats as TypeOverallStats} from "@/types/billing";
import {Pagination as TypePagination, PaginatedResponse as TypePaginatedResponse, ErrorResponse as TypeErrorResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {shouldIgnoreTax} from "@/helpers";

export default function BillingHistoryPage() {
  const defaultFilters: TypeBillFilters = {
    start_date: '',
    end_date: '',
    customer_name: '',
    item_name: '',
    min_total: '',
    max_total: '',
    sort_by: BillSortBy.DATE_NEWEST,
  };

  const [isBillsLoading, setIsBillsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [bills, setBills] = useState<TypeBillWithCustomer[]>([]);
  const [pagination, setPagination] = useState<TypePagination | null>(null);
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);
  const [todayStats, setTodayStats] = useState<TypeTodayStats | null>(null);
  const [overallStats, setOverallStats] = useState<TypeOverallStats | null>(null);
  const [filters, setFilters] = useState<TypeBillFilters>({...defaultFilters});
  const [appliedFilters, setAppliedFilters] = useState<TypeBillFilters>({...defaultFilters});
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof TypeBillFilters, value: string) => {
    setFilters((prev: TypeBillFilters) => ({...prev, [key]: value}));
  };

  const applyFilters = () => {
    setAppliedFilters({...filters});
    fetchBills(1, filters);
  };

  const resetFilters = () => {
    setFilters({...defaultFilters});
    setAppliedFilters({...defaultFilters});
    fetchBills(1, defaultFilters);
  };

  async function fetchBills(page: number = 1, currentFilters?: TypeBillFilters): Promise<void> {
    setIsBillsLoading(true);

    const f: TypeBillFilters = currentFilters ?? appliedFilters;
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('per_page', '10');

    if (f.start_date) params.set('start_date', f.start_date);
    if (f.end_date) params.set('end_date', f.end_date);
    if (f.customer_name) params.set('customer_name', f.customer_name);
    if (f.item_name) params.set('item_name', f.item_name);
    if (f.min_total) params.set('min_total', f.min_total);
    if (f.max_total) params.set('max_total', f.max_total);
    if (f.sort_by !== BillSortBy.DATE_NEWEST) params.set('sort_by', f.sort_by);

    const response: Response = await fetch(`/api/billing/history?${params.toString()}`);
    const data: TypePaginatedResponse<TypeBillWithCustomer> | TypeErrorResponse = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch billing history');
    }

    setBills(data.data);
    setPagination(data.pagination ?? null);
    setIsBillsLoading(false);
  }

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

  const activeFilterCount: number = [
    appliedFilters.start_date,
    appliedFilters.end_date,
    appliedFilters.customer_name,
    appliedFilters.item_name,
    appliedFilters.min_total,
    appliedFilters.max_total,
    appliedFilters.sort_by !== BillSortBy.DATE_NEWEST ? appliedFilters.sort_by : '',
  ].filter(Boolean).length;

  const toggleExpand = (billId: number) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
          <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Billing History
          </h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {isStatsLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4 animate-pulse">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Filters Section */}
          <div className="mb-6 bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 cursor-pointer bg-transparent border-none text-left"
              onClick={() => setShowFilters(!showFilters)}
            >
              <span className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                Filters & Sort
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white -bg-linear-120 from-[#ff7a18] to-[#ffb347] rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {showFilters && (
              <div className="border-t-2 border-[#f0e6dd] dark:border-gray-700 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Start Date */}
                  <div>
                    <label htmlFor="start_date" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="start_date"
                      className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                      value={filters.start_date}
                      onChange={(e) => updateFilter('start_date', e.target.value)}
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label htmlFor="end_date" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="end_date"
                      className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                      value={filters.end_date}
                      onChange={(e) => updateFilter('end_date', e.target.value)}
                    />
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label htmlFor="customer_name" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      id="customer_name"
                      placeholder="Search by customer..."
                      className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                      value={filters.customer_name}
                      onChange={(e) => updateFilter('customer_name', e.target.value)}
                    />
                  </div>

                  {/* Item Name */}
                  <div>
                    <label htmlFor="item_name" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                      Item Name
                    </label>
                    <input
                      type="text"
                      id="item_name"
                      placeholder="Search by item..."
                      className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                      value={filters.item_name}
                      onChange={(e) => updateFilter('item_name', e.target.value)}
                    />
                  </div>

                  {/* Min Total */}
                  <div>
                    <label htmlFor="min_total" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                      Min Total Amount
                    </label>
                    <input
                      type="number"
                      id="min_total"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                      value={filters.min_total}
                      onChange={(e) => updateFilter('min_total', e.target.value)}
                    />
                  </div>

                  {/* Max Total */}
                  <div>
                    <label htmlFor="max_total" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                      Max Total Amount
                    </label>
                    <input
                      type="number"
                      id="max_total"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                      value={filters.max_total}
                      onChange={(e) => updateFilter('max_total', e.target.value)}
                    />
                  </div>
                </div>

                {/* Sort By */}
                <div className="mt-4 max-w-sm">
                  <label htmlFor="sort_by" className="block mb-1.5 font-semibold text-[#1f1f1f] dark:text-gray-300 text-sm">
                    Sort By
                  </label>
                  <select
                    id="sort_by"
                    className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                    value={filters.sort_by}
                    onChange={(e) => updateFilter('sort_by', e.target.value)}
                  >
                    <option value={BillSortBy.DATE_NEWEST}>Date (Newest First)</option>
                    <option value={BillSortBy.DATE_OLDEST}>Date (Oldest First)</option>
                    <option value={BillSortBy.TOTAL_HIGH}>Total (High to Low)</option>
                    <option value={BillSortBy.TOTAL_LOW}>Total (Low to High)</option>
                    <option value={BillSortBy.CUSTOMER_NAME}>Customer Name (A-Z)</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-5">
                  <button
                    className="rounded-[14px] px-5 py-2 text-[15px] font-semibold border-2 border-solid border-[#ffb347] text-[#ff7a18] bg-transparent cursor-pointer"
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                  <button
                    className="border-none rounded-2xl px-5 py-2 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer"
                    style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bills List */}
          {isBillsLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
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
                          {bill.customers?.name || 'Walk-in Customer'}
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
                            {bill.bill_items.map((item: TypeBillItem) => (
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
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-bold text-gray-900 dark:text-white">
                              <td className="py-2">Total</td>
                              <td className="py-2 text-right">
                                {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + item.quantity, 0)}
                              </td>
                              <td className="py-2 text-right">
                                {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + (item.price * item.quantity), 0).toFixed(2)}
                              </td>
                              {!shouldIgnoreTax() && (
                                <td className="py-2 text-right">
                                  {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + ((item.sgst + item.cgst) * item.price * item.quantity / 100), 0).toFixed(2)}
                                </td>
                              )}
                              <td className="py-2 text-right">
                                {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + item.total, 0).toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
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
                    onClick={() => fetchBills(pagination.current_page - 1, appliedFilters)}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-xl border-2 border-[#f0e6dd] dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    disabled={!pagination.has_next_page}
                    onClick={() => fetchBills(pagination.current_page + 1, appliedFilters)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
