'use client';

import {useEffect, useMemo, useState} from "react";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {BillingItem as TypeBillingItem, SaveInvoiceDto as TypeSaveInvoiceDto, SaveInvoiceItemDto as TypeSaveInvoiceItemDto} from "@/types/billing";
import InputField from "@/components/Inputs/Input";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {Bill as TypeBill} from "@/types/billing";
import {calculateTotalValue} from "@/helpers";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import CategoryBillingItem from "@/components/CategoryBillingItem";
import BillingSummary from "@/components/BillingSummary";

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [billingItems, setBillingItems] = useState<TypeBillingItem[]>([]);
  const [categoryWithMenuItems, setCategoryWithMenuItems] = useState<TypeCategoryWithMenuItem[]>([]);

  // Data fetching
  useEffect(() => {
    fetchMenuItems().then(r => console.log(r));
  }, []);

  async function fetchMenuItems(): Promise<void> {
    setIsLoading(true);
    const response: Response = await fetch(`/api/categories/with_menu_items`, {
      next: {revalidate: 3600}
    });
    const data: TypeApiListResponse<TypeCategoryWithMenuItem> = await response.json();
    if (!data.success) throw new Error('Failed to fetch menu items');
    setCategoryWithMenuItems(data.data);
    setIsLoading(false);
  }

  // Filtered menu items
  const filteredCategoryWithMenuItems: TypeCategoryWithMenuItem[] = useMemo(() => {
    if (!filterValue) return categoryWithMenuItems;

    return categoryWithMenuItems
      .map((category: TypeCategoryWithMenuItem) => {
        const categoryMatches: boolean = (category.name ?? "").toLowerCase().includes(filterValue);
        const matchingItems: TypeMenuItem[] = category.menu_items.filter((item: TypeMenuItem) =>
          (item.name ?? "").toLowerCase().includes(filterValue)
        );
        return categoryMatches ? category : {...category, menu_items: matchingItems};
      })
      .filter((category: TypeCategoryWithMenuItem) =>
        (category.name ?? "").toLowerCase().includes(filterValue) ||
        (category.menu_items?.length ?? 0) > 0
      );
  }, [categoryWithMenuItems, filterValue]);

  // Cart management
  const updateItem = (item: TypeBillingItem, quantity: number) => {
    setBillingItems((prev: TypeBillingItem[]) => {
      const idx: number = prev.findIndex((x: TypeBillingItem): boolean => x.id === item.id);
      const next: TypeBillingItem[] = idx !== -1
        ? prev.map((x: TypeBillingItem, i: number) => i === idx ? {...x, quantity} : x)
        : [...prev, {...item, quantity}];
      return next.filter((x: TypeBillingItem): boolean => x.quantity > 0);
    });
  };

  const clearBilling = () => {
    if (window.confirm('Do you really want to clear the items?')) {
      setBillingItems([]);
    }
  };

  // Save invoice
  const saveInvoice = async () => {
    if (billingItems.length === 0) return;
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    setIsSaving(true);

    const invoiceDto: TypeSaveInvoiceDto = {
      customer_name: customerName,
      items: billingItems.map((item: TypeBillingItem): TypeSaveInvoiceItemDto => ({
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        sgst: item.sgst ?? 0,
        cgst: item.cgst ?? 0,
        quantity: item.quantity,
        total: calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity),
      })),
    };

    try {
      const response: Response = await fetch('/api/billing', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(invoiceDto),
      });
      const data: TypeApiResponse<TypeBill> = await response.json();
      if (!data.success) {
        alert('Failed to save invoice: ' + data.error);
        return;
      }
      alert('Invoice saved successfully!');
      setBillingItems([]);
      setCustomerName('');
    } catch {
      alert('Failed to save invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="md:px-[2%] mx-auto">
        <div className="lg:flex gap-4">
          {/* Left panel: customer + menu items */}
          <div className={`lg:w-3/4 space-y-12 lg:pb-0 ${billingItems.length > 0 ? 'pb-[25vh]' : ''}`}>
            {/* Customer name */}
            <div className="px-4 py-8 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
              <div className="mb-4 max-w-100">
                <InputField
                  id="customer_name"
                  title="Customer Name:"
                  placeholder="Enter customer name"
                  value={customerName}
                  onchange={(id: string, value: string | number) => setCustomerName(value + '')}
                  clearButton={true}
                />
              </div>
            </div>

            {/* Menu items */}
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-6 rounded-2xl border-2 border-[#f0e6dd] dark:border-gray-600">
              <InputField
                id="filter"
                title="Filter"
                placeholder="Filter Items"
                value={filterValue}
                onchange={(id: string, value: string | number) => setFilterValue((value + '').toLowerCase())}
                clearButton={true}
              />
              <div className="flex flex-col gap-4">
                {isLoading ? (
                  Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl animate-pulse">
                      <div className="flex items-center justify-between px-6 py-4">
                        <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 px-5 pb-5">
                        {Array.from({length: 3}).map((_, j) => (
                          <div key={j} className="min-h-45 border-2 border-[#f0e6dd] dark:border-gray-700 bg-[#fffbf6] dark:bg-gray-950 p-4.5 rounded-2xl flex flex-col gap-2">
                            <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-3.5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="mt-auto flex items-center justify-between gap-3">
                              <div className="w-9.5 h-9.5 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                              <div className="h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              <div className="w-9.5 h-9.5 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  filteredCategoryWithMenuItems.map((category: TypeCategoryWithMenuItem) => (
                    <CategoryBillingItem
                      key={category.id}
                      categoryWithMenuItem={category}
                      billingItems={billingItems}
                      updateBillingItemAction={updateItem}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right panel: bill summary */}
          <BillingSummary
            customerName={customerName}
            billingItems={billingItems}
            isSaving={isSaving}
            onSave={saveInvoice}
            onClear={clearBilling}
            onPrint={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
