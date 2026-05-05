'use client';

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {Customer as TypeCustomer, BillWithCustomer as TypeBillWithCustomer, BillItem as TypeBillItem} from "@/types/billing";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import {shouldIgnoreTax} from "@/helpers";
import {printBillReceipt} from "@/components/ThermalReceipt";
import toast from "react-hot-toast";
import Link from "next/link";

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

  if (isLoading) {
    return (
      <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            {Array.from({length: 3}).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gray-500 dark:text-gray-400">Customer not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#ff7a18] hover:underline mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to Customers
        </Link>

        {/* Customer Info */}
        <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {customer.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Customer since {formatDate(customer.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{bills.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{bills.reduce((sum, b) => sum + b.total_amount, 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Spent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bills */}
        <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
          <h2 className="m-0 mb-5 text-xl font-bold text-gray-900 dark:text-white">
            Order History
          </h2>

          {bills.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No orders found for this customer.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {bills.map((bill: TypeBillWithCustomer) => (
                <div
                  key={bill.id}
                  className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  {/* Bill header */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    onClick={() => toggleExpand(bill.id)}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        #{bill.id} &middot; {formatDate(bill.created_at)}
                      </span>
                      <span className="text-base font-semibold text-gray-900 dark:text-white">
                        {bill.bill_items.length} item{bill.bill_items.length !== 1 ? 's' : ''}
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
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border-none bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{boxShadow: "0 8px 16px rgba(255,122,24,.2)"}}
                          disabled={printingBillId === bill.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setPrintingBillId(bill.id);
                            await printBillReceipt(bill);
                            setPrintingBillId(null);
                          }}
                        >
                          {printingBillId === bill.id ? (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M8 15H16V18M16 18V21H8V18H4V9H8M16 18H20V9H8M8 9V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {printingBillId === bill.id ? 'Printing...' : 'Print Invoice'}
                        </button>
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
          )}
        </div>
      </div>
    </div>
  );
}
