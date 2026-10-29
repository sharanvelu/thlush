'use client';

import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {Customer as TypeCustomer} from "@/types/billing";
import toast from "react-hot-toast";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

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
    <div>
      <PageHeader title="Customers" description="Everyone who has been billed, with their order counts."/>

      <div className="card overflow-hidden rise">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({length: 5}).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
                <div className="skeleton size-9 shrink-0 !rounded-full"></div>
                <div className="skeleton h-4 w-40"></div>
                <div className="skeleton ml-auto h-4 w-16"></div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="empty">
            <Icon name="users" size={28} className="text-ink-4"/>
            <p className="font-medium text-ink-2">No customers found</p>
            <p className="text-[13px]">Customers appear here once they are added to a bill.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="r">Orders</th>
                  <th className="hidden sm:table-cell">Created</th>
                  <th className="r"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: CustomerWithOrderCount) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
                          {(customer.name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {editingId === customer.id ? (
                            <input
                              type="text"
                              className="field max-w-xs"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(customer.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="truncate font-medium text-ink">{customer.name}</div>
                          )}
                          <div className="num text-xs text-ink-3">#{customer.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="r"><span className="badge badge-accent num">{customer.order_count}</span></td>
                    <td className="hidden text-ink-2 sm:table-cell">{formatDate(customer.created_at)}</td>
                    <td className="r">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === customer.id ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(customer.id)} disabled={isSaving}>
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit} disabled={isSaving}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href={`/admin/customers/${customer.id}`} className="btn btn-ghost btn-icon btn-sm" title="View customer" aria-label="View customer">
                              <Icon name="chevronRight" size={15}/>
                            </Link>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(customer)} title="Edit name" aria-label="Edit name">
                              <Icon name="edit" size={15}/>
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
      </div>
    </div>
  );
}
