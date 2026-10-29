'use client';

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {Customer as TypeCustomer, BillWithCustomer as TypeBillWithCustomer, BillItem as TypeBillItem} from "@/types/billing";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import {shouldIgnoreTax} from "@/helpers";
import {printBillReceipt} from "@/components/ThermalReceipt";
import toast from "react-hot-toast";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.customer_id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<TypeCustomer | null>(null);
  const [bills, setBills] = useState<TypeBillWithCustomer[]>([]);
  const [expandedBillId, setExpandedBillId] = useState<number | null>(null);
  const [printingBillId, setPrintingBillId] = useState<number | null>(null);

  const fetchCustomer = async () => {
    setIsLoading(true);
    const response: Response = await fetch(`/api/admin/customers/${customerId}`);
    const data: TypeApiResponse<{ customer: TypeCustomer; bills: TypeBillWithCustomer[] }> = await response.json();

    if (data.success && data.data) {
      setCustomer(data.data.customer);
      setBills(data.data.bills);
    } else {
      toast.error('Failed to load customer');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomer().then();
  }, [customerId]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const toggleExpand = (billId: number) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };
  const backLink = (
    <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink">
      <Icon name="chevronLeft" size={15}/>
      Back to customers
    </Link>
  );

  if (isLoading) {
    return (
      <div>
        {backLink}
        <div className="skeleton mb-2 h-7 w-48"></div>
        <div className="skeleton mb-6 h-4 w-32"></div>
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="skeleton h-20 !rounded-[14px]"></div>
          <div className="skeleton h-20 !rounded-[14px]"></div>
        </div>
        <div className="card overflow-hidden">
          {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-line p-4 last:border-b-0">
              <div className="skeleton h-4 w-40"></div>
              <div className="skeleton h-4 w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        {backLink}
        <div className="card empty">
          <Icon name="alert" size={26} className="text-ink-4"/>
          <p className="font-medium text-ink-2">Customer not found</p>
        </div>
      </div>
    );
  }

  const totalSpent: number = bills.reduce((sum, b) => sum + b.total_amount, 0);

  return (
    <div>
      {backLink}

      <PageHeader title={customer.name} description={`Customer since ${formatDate(customer.created_at)}`}/>

      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 rise">
        <div className="card card-pad">
          <div className="eyebrow">Orders</div>
          <div className="num mt-1 text-2xl font-semibold text-ink">{bills.length}</div>
        </div>
        <div className="card card-pad">
          <div className="eyebrow">Total spent</div>
          <div className="num mt-1 truncate text-2xl font-semibold text-ink">₹{totalSpent.toFixed(2)}</div>
        </div>
      </div>

      {/* Bills */}
      <div className="card overflow-hidden">
        <div className="card-head">
          <h2 className="card-title">Order history</h2>
          <span className="num text-xs text-ink-3">{bills.length}</span>
        </div>

        {bills.length === 0 ? (
          <div className="empty">
            <Icon name="receipt" size={28} className="text-ink-4"/>
            <p className="font-medium text-ink-2">No orders yet</p>
            <p className="text-[13px]">No orders found for this customer.</p>
          </div>
        ) : (
          <div>
            {bills.map((bill: TypeBillWithCustomer) => {
              const expanded: boolean = expandedBillId === bill.id;
              return (
                <div key={bill.id} className="border-b border-line last:border-b-0">
                  {/* Bill header */}
                  <div
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-sunken"
                    onClick={() => toggleExpand(bill.id)}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-ink">
                        {bill.bill_items.length} item{bill.bill_items.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-ink-3">
                        <span className="num">#{bill.id}</span> &middot; {formatDate(bill.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-sm font-semibold text-ink">
                        {bill.currency} {bill.total_amount.toFixed(2)}
                      </span>
                      <Icon name="chevronDown" size={16} className={`text-ink-3 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}/>
                    </div>
                  </div>

                  {/* Bill items - expandable */}
                  {expanded && (
                    <div className="pop border-t border-line bg-sunken px-5 py-4" style={{transformOrigin: 'top'}}>
                      <div className="overflow-x-auto rounded-xl bg-surface shadow-ring">
                        <table className="tbl">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th className="r">Qty</th>
                              <th className="r">Price</th>
                              {!shouldIgnoreTax() && <th className="r">Tax</th>}
                              <th className="r">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bill.bill_items.map((item: TypeBillItem) => (
                              <tr key={item.id}>
                                <td className="font-medium">{item.name}</td>
                                <td className="r num text-ink-2">{item.quantity}</td>
                                <td className="r num text-ink-2">{item.price.toFixed(2)}</td>
                                {!shouldIgnoreTax() && (
                                  <td className="r num text-ink-2">
                                    {((item.sgst + item.cgst) * item.price * item.quantity / 100).toFixed(2)}
                                  </td>
                                )}
                                <td className="r num font-medium">{item.total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-line-strong font-semibold">
                              <td className="px-4 py-3">Total</td>
                              <td className="num px-4 py-3 text-right">
                                {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + item.quantity, 0)}
                              </td>
                              <td className="num px-4 py-3 text-right">
                                {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + (item.price * item.quantity), 0).toFixed(2)}
                              </td>
                              {!shouldIgnoreTax() && (
                                <td className="num px-4 py-3 text-right">
                                  {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + ((item.sgst + item.cgst) * item.price * item.quantity / 100), 0).toFixed(2)}
                                </td>
                              )}
                              <td className="num px-4 py-3 text-right">
                                {bill.bill_items.reduce((sum: number, item: TypeBillItem) => sum + item.total, 0).toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Bill summary */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <button
                          className="btn btn-primary"
                          disabled={printingBillId === bill.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setPrintingBillId(bill.id);
                            await printBillReceipt(bill);
                            setPrintingBillId(null);
                          }}
                        >
                          <Icon name="print" size={15}/>
                          {printingBillId === bill.id ? 'Printing…' : 'Print Invoice'}
                        </button>
                        <div className="text-right text-[13px]">
                          {!shouldIgnoreTax() && (
                            <div className="num text-ink-3">
                              Tax: {bill.currency} {bill.total_tax.toFixed(2)}
                            </div>
                          )}
                          <div className="num text-base font-semibold text-ink">
                            Total: {bill.currency} {bill.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
