'use client';

import {useEffect, useState} from "react";
import {BillFilters as TypeBillFilters, BillSortBy, BillWithCustomer as TypeBillWithCustomer, BillItem as TypeBillItem, TodayStats as TypeTodayStats, OverallStats as TypeOverallStats} from "@/types/billing";
import {Pagination as TypePagination, PaginatedResponse as TypePaginatedResponse, ErrorResponse as TypeErrorResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {shouldIgnoreTax} from "@/helpers";
import toast from "react-hot-toast";
import {printBillReceipt} from "@/components/ThermalReceipt";
import SelectField from "@/components/Inputs/Select";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

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
  const [isExporting, setIsExporting] = useState(false);
  const [printingBillId, setPrintingBillId] = useState<number | null>(null);

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

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const f: TypeBillFilters = appliedFilters;
      const params = new URLSearchParams();

      if (f.start_date) params.set('start_date', f.start_date);
      if (f.end_date) params.set('end_date', f.end_date);
      if (f.customer_name) params.set('customer_name', f.customer_name);
      if (f.item_name) params.set('item_name', f.item_name);
      if (f.min_total) params.set('min_total', f.min_total);
      if (f.max_total) params.set('max_total', f.max_total);
      if (f.sort_by !== BillSortBy.DATE_NEWEST) params.set('sort_by', f.sort_by);

      const response: Response = await fetch(`/api/billing/export?${params.toString()}`);

      if (!response.ok) {
        toast.error('Failed to export bills.');
        return;
      }

      const blob: Blob = await response.blob();
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `billing-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Bills exported successfully!');
    } catch {
      toast.error('Failed to export bills.');
    } finally {
      setIsExporting(false);
    }
  };

  const money = (n: number): string => n.toFixed(2);

  const renderDetail = (bill: TypeBillWithCustomer) => {
    const taxOn: boolean = !shouldIgnoreTax();
    const qty: number = bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + item.quantity, 0);
    return (
      <div className="pop mx-auto w-full max-w-md rounded-lg bg-raised px-4 py-4 shadow-ring num text-[12.5px] text-ink">
        <div className="text-center">
          <div className="text-[13px] font-semibold uppercase tracking-[0.12em]">Bill #{bill.id}</div>
          <div className="text-ink-3">{formatDate(bill.created_at)}</div>
          <div className="text-ink-2">{bill.customers?.name || 'Walk-in Customer'}</div>
        </div>
        <hr className="rule-dash my-3"/>
        <div className="flex flex-col gap-2">
          {bill.bill_items.map((item: TypeBillItem) => (
            <div key={item.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words">{item.name}</span>
                <span>{money(item.total)}</span>
              </div>
              <div className="text-ink-3">
                {item.quantity} x {money(item.price)}
                {taxOn && ` + tax ${money((item.sgst + item.cgst) * item.price * item.quantity / 100)}`}
              </div>
            </div>
          ))}
        </div>
        <hr className="rule-dash my-3"/>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-ink-2"><span>Items</span><span>{qty}</span></div>
          {taxOn && (
            <div className="flex justify-between text-ink-2"><span>Tax</span><span>{bill.currency} {money(bill.total_tax)}</span></div>
          )}
          <div className="flex justify-between text-[14px] font-semibold">
            <span>TOTAL</span><span>{bill.currency} {money(bill.total_amount)}</span>
          </div>
        </div>
        <hr className="rule-dash my-3"/>
        <div className="flex justify-center">
          <button
            className="btn btn-primary btn-sm"
            disabled={printingBillId === bill.id}
            onClick={async (e) => {
              e.stopPropagation();
              setPrintingBillId(bill.id);
              await printBillReceipt(bill);
              setPrintingBillId(null);
            }}
          >
            <Icon name="print" size={14}/>
            {printingBillId === bill.id ? 'Printing...' : 'Print Invoice'}
          </button>
        </div>
      </div>
    );
  };

  const statItems: {label: string; value: string; accent?: boolean}[] = [
    {label: "Today's Bills", value: String(todayStats?.total_bills ?? '-')},
    {label: "Today's Revenue", value: todayStats ? `₹${money(todayStats.total_revenue)}` : '-', accent: true},
    {label: 'Avg Order Value', value: todayStats ? `₹${money(todayStats.avg_order_value)}` : '-'},
    {label: 'Items Sold Today', value: String(todayStats?.total_items ?? '-')},
    {label: 'Overall Bills', value: String(overallStats?.total_bills ?? '-')},
  ];

  const inputs: {id: keyof TypeBillFilters; label: string; type: string; placeholder?: string}[] = [
    {id: 'start_date', label: 'Start Date', type: 'date'},
    {id: 'end_date', label: 'End Date', type: 'date'},
    {id: 'customer_name', label: 'Customer Name', type: 'text', placeholder: 'Search by customer...'},
    {id: 'item_name', label: 'Item Name', type: 'text', placeholder: 'Search by item...'},
    {id: 'min_total', label: 'Min Total Amount', type: 'number', placeholder: '0.00'},
    {id: 'max_total', label: 'Max Total Amount', type: 'number', placeholder: '0.00'},
  ];

  return (
    <div>
      <PageHeader
        title="Billing History"
        description="Browse, filter and reprint past bills."
        actions={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              <Icon name="filter" size={15}/>
              Filters
              {activeFilterCount > 0 && <span className="badge badge-accent num">{activeFilterCount}</span>}
            </button>
            <button className="btn btn-secondary" onClick={exportCsv} disabled={isExporting}>
              <Icon name="download" size={15}/>
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </>
        }
      />

      {/* Stats strip */}
      <div className="card mb-5 grid grid-cols-2 md:grid-cols-5">
        {statItems.map((st, i) => (
          <div key={st.label} className={`px-4 py-3 ${i > 0 ? 'md:border-l md:border-line' : ''} ${i % 2 === 1 ? 'border-l border-line md:border-l-0' : ''} ${i >= 2 ? 'border-t border-line md:border-t-0' : ''} ${i === statItems.length - 1 && statItems.length % 2 === 1 ? 'col-span-2 md:col-span-1' : ''}`}>
            <div className="eyebrow">{st.label}</div>
            {isStatsLoading ? (
              <div className="skeleton mt-2 h-6 w-16"></div>
            ) : (
              <div className={`num mt-1 text-xl font-semibold ${st.accent ? 'text-accent' : 'text-ink'}`}>{st.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card card-pad rise mb-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inputs.map((inp) => (
              <div key={inp.id}>
                <label htmlFor={inp.id} className="field-label">{inp.label}</label>
                <input
                  type={inp.type}
                  id={inp.id}
                  placeholder={inp.placeholder}
                  {...(inp.type === 'number' ? {min: '0', step: '0.01'} : {})}
                  className={`field ${inp.type === 'number' ? 'num' : ''}`}
                  value={filters[inp.id]}
                  onChange={(e) => updateFilter(inp.id, e.target.value)}
                />
              </div>
            ))}
            <div>
              <SelectField
                id="sort_by"
                title="Sort By"
                placeholder="Select Status"
                value={filters.sort_by}
                onchange={(name: string, value: string | number) => updateFilter('sort_by', value.toString())}
                options={[
                  {value: BillSortBy.DATE_NEWEST, text: "Date (Newest First)"},
                  {value: BillSortBy.DATE_OLDEST, text: "Date (Oldest First)"},
                  {value: BillSortBy.TOTAL_HIGH, text: "Total (High to Low)"},
                  {value: BillSortBy.TOTAL_LOW, text: "Total (Low to High)"},
                  {value: BillSortBy.CUSTOMER_NAME_A_Z, text: "Customer Name (A-Z)"},
                  {value: BillSortBy.CUSTOMER_NAME_Z_A, text: "Customer Name (Z-A)"},
                ]}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button className="btn btn-primary" onClick={applyFilters}>Apply Filters</button>
            <button className="btn btn-secondary" onClick={resetFilters}>Reset</button>
          </div>
        </div>
      )}

      {/* Bills */}
      {isBillsLoading ? (
        <div className="card overflow-hidden">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 last:border-b-0">
              <div className="flex flex-col gap-2">
                <div className="skeleton h-3 w-32"></div>
                <div className="skeleton h-4 w-40"></div>
              </div>
              <div className="skeleton h-5 w-20"></div>
            </div>
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="card empty">
          <Icon name="receipt" size={28}/>
          <p className="text-ink-2 font-medium">No bills found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="r">Items</th>
                  <th className="r">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill: TypeBillWithCustomer) => {
                  const open: boolean = expandedBillId === bill.id;
                  return [
                    <tr key={bill.id} className="cursor-pointer" onClick={() => toggleExpand(bill.id)}>
                      <td className="num font-medium">#{bill.id}</td>
                      <td className="num text-ink-2">{formatDate(bill.created_at)}</td>
                      <td className="font-medium">{bill.customers?.name || <span className="text-ink-3 font-normal">Walk-in Customer</span>}</td>
                      <td className="r num text-ink-2">{bill.bill_items.length}</td>
                      <td className="r num font-semibold">{bill.currency} {money(bill.total_amount)}</td>
                      <td className="text-ink-3">
                        <Icon name="chevronDown" size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}/>
                      </td>
                    </tr>,
                    open && (
                      <tr key={`${bill.id}-d`} className="bg-sunken hover:bg-sunken">
                        <td colSpan={6} className="py-5">{renderDetail(bill)}</td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked rows */}
          <div className="card overflow-hidden md:hidden">
            {bills.map((bill: TypeBillWithCustomer) => {
              const open: boolean = expandedBillId === bill.id;
              return (
                <div key={bill.id} className="border-b border-line last:border-b-0">
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
                    onClick={() => toggleExpand(bill.id)}
                    aria-expanded={open}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="num text-xs text-ink-3">#{bill.id} · {formatDate(bill.created_at)}</span>
                      <span className="truncate font-medium text-ink">{bill.customers?.name || 'Walk-in Customer'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="num font-semibold text-ink">{bill.currency} {money(bill.total_amount)}</span>
                      <Icon name="chevronDown" size={16} className={`text-ink-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}/>
                    </div>
                  </button>
                  {open && <div className="bg-sunken px-3 py-4">{renderDetail(bill)}</div>}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                className="btn btn-secondary btn-sm"
                disabled={!pagination.has_prev_page}
                onClick={() => fetchBills(pagination.current_page - 1, appliedFilters)}
              >
                <Icon name="chevronLeft" size={14}/>
                Previous
              </button>
              <span className="num text-xs text-ink-2">
                Page {pagination.current_page} of {pagination.total_pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!pagination.has_next_page}
                onClick={() => fetchBills(pagination.current_page + 1, appliedFilters)}
              >
                Next
                <Icon name="chevronRight" size={14}/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
