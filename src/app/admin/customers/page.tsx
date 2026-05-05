'use client';

import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {Customer as TypeCustomer} from "@/types/billing";
import toast from "react-hot-toast";
import Link from "next/link";

interface CustomerWithOrderCount extends TypeCustomer {
  order_count: number;
}

export default function AdminCustomersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerWithOrderCount[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    const response: Response = await fetch('/api/admin/customers');
    const data: TypeApiListResponse<CustomerWithOrderCount> = await response.json();

    if (data.success) {
      setCustomers(data.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers().then();
  }, []);

  const startEdit = (customer: CustomerWithOrderCount) => {
    setEditingId(customer.id);
    setEditName(customer.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response: Response = await fetch(`/api/admin/customers/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: editName.trim()}),
      });
      const data: TypeApiResponse<TypeCustomer> = await response.json();

      if (!data.success) {
        toast.error(data.error || 'Failed to update customer');
        return;
      }

      toast.success('Customer updated successfully!');
      setEditingId(null);
      await fetchCustomers();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6">
          <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Manage Customers
          </h1>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({length: 5}).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-xl p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {customers.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No customers found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b-2 border-[#f0e6dd] dark:border-gray-700">
                        <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">ID</th>
                        <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Name</th>
                        <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-center">Orders</th>
                        <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">Created</th>
                        <th className="pb-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer: CustomerWithOrderCount) => (
                        <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                          <td className="py-3 text-gray-600 dark:text-gray-400">#{customer.id}</td>
                          <td className="py-3">
                            {editingId === customer.id ? (
                              <input
                                type="text"
                                className="w-full max-w-xs p-2 border-2 border-solid border-[#ff7a18] text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-lg text-sm focus:outline-none"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(customer.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className="font-medium text-gray-900 dark:text-white">{customer.name}</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 text-xs font-bold text-white bg-linear-120 from-[#ff7a18] to-[#ffb347] rounded-full">
                              {customer.order_count}
                            </span>
                          </td>
                          <td className="py-3 text-gray-600 dark:text-gray-400">{formatDate(customer.created_at)}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {editingId === customer.id ? (
                                <>
                                  <button
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border-none bg-linear-120 from-[#28a745] to-[#20c997] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => saveEdit(customer.id)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 border-solid border-[#e0d7cf] dark:border-gray-600 bg-transparent text-gray-600 dark:text-gray-300 cursor-pointer"
                                    onClick={cancelEdit}
                                    disabled={isSaving}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Link
                                    href={`/admin/customers/${customer.id}`}
                                    className="flex items-center justify-center w-8 h-8 border-2 border-solid border-[#e0d7cf] dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-[#ff7a18] hover:border-[#ff7a18] transition"
                                    title="View customer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                  </Link>
                                  <button
                                    className="flex items-center justify-center w-8 h-8 border-2 border-solid border-[#e0d7cf] dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-[#ff7a18] hover:border-[#ff7a18] transition cursor-pointer"
                                    onClick={() => startEdit(customer)}
                                    title="Edit name"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
