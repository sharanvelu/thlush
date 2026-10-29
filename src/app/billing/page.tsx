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
import {buildReceiptHtml, printReceipt} from "@/components/ThermalReceipt";
import ConfirmModal from "@/components/ConfirmModal";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import toast from "react-hot-toast";

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [billingItems, setBillingItems] = useState<TypeBillingItem[]>([]);
  const [categoryWithMenuItems, setCategoryWithMenuItems] = useState<TypeCategoryWithMenuItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  const clearBilling = () => setShowClearConfirm(true);

  // Save invoice (returns bill on success, null on failure)
  const doSaveInvoice = async (): Promise<TypeBill | null> => {
    if (billingItems.length === 0) return null;
    if (!customerName.trim()) {
      toast.error('Please enter a customer name.');
      return null;
    }

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
        toast.error('Failed to save invoice: ' + data.error);
        return null;
      }
      return data.data;
    } catch {
      toast.error('Failed to save invoice. Please try again.');
      return null;
    }
  };

  const saveInvoice = async () => {
    setIsSaving(true);
    const bill = await doSaveInvoice();
    setIsSaving(false);
    if (bill) {
      toast.success('Invoice saved successfully!');
      setBillingItems([]);
      setCustomerName('');
    }
  };

  const saveAndPrint = async () => {
    setIsSaving(true);
    const bill: TypeBill | null = await doSaveInvoice();
    if (!bill) {
      setIsSaving(false);
      setIsPrinting(false);
      return;
    }

    toast.success('Invoice saved successfully!');

    setIsSaving(false);
    setIsPrinting(true);

    const now: string = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const html: string = buildReceiptHtml(bill.id, customerName, billingItems, now);

    await printReceipt(html);
    setIsPrinting(false);
    setBillingItems([]);
    setCustomerName('');
  };

  return (
    <>
      <PageHeader title="Billing" description="Tap items to build the bill, then save or print."/>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        {/* Left pane: search + menu */}
        <div className="min-w-0">
          <InputField
            id="filter"
            title="Search menu"
            placeholder="Search items or categories"
            value={filterValue}
            onchange={(id: string, value: string | number) => setFilterValue((value + '').toLowerCase())}
            clearButton={true}
          />
          <div className="flex flex-col gap-4">
            {isLoading ? (
              Array.from({length: 2}).map((_, i) => (
                <div key={i} className="card">
                  <div className="card-head">
                    <div className="skeleton h-4 w-32"></div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 p-4">
                    {Array.from({length: 3}).map((_, j) => (
                      <div key={j} className="rounded-[10px] bg-sunken p-3.5 flex flex-col gap-2 min-h-[104px]">
                        <div className="skeleton h-4 w-28"></div>
                        <div className="skeleton h-3 w-40"></div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="skeleton h-4 w-14"></div>
                          <div className="skeleton h-7 w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : filteredCategoryWithMenuItems.length === 0 ? (
              <div className="card empty">
                <Icon name="search" size={22}/>
                <p className="text-ink-2 font-medium">No items found</p>
                <p className="text-ink-3">Try a different search term.</p>
              </div>
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

        {/* Right pane: customer + receipt */}
        <div id="bill" className="lg:sticky lg:top-6 flex flex-col gap-4 pb-3 scroll-mt-20">
          <div className="card card-pad pb-1">
            <InputField
              id="customer_name"
              title="Customer name"
              placeholder="Enter customer name"
              value={customerName}
              onchange={(id: string, value: string | number) => setCustomerName(value + '')}
              clearButton={true}
            />
          </div>
          <BillingSummary
            customerName={customerName}
            billingItems={billingItems}
            isSaving={isSaving}
            isPrinting={isPrinting}
            onSave={saveInvoice}
            onClear={clearBilling}
            onPrint={saveAndPrint}
          />
        </div>
      </div>

      {/* Mobile: sticky total bar that jumps to the bill */}
      {billingItems.length > 0 && (
        <a
          href="#bill"
          className="pop lg:hidden fixed inset-x-3 bottom-3 z-20 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-canvas shadow-pop"
        >
          <span className="text-[13px] font-medium">
            {billingItems.reduce((n: number, i: TypeBillingItem) => n + i.quantity, 0)} item(s) · View bill
          </span>
          <span className="num text-[15px] font-semibold">
            ₹{billingItems.reduce((sum: number, i: TypeBillingItem) => sum + calculateTotalValue(i.price, i.sgst, i.cgst, i.quantity), 0).toFixed(2)}
          </span>
        </a>
      )}

      <ConfirmModal
        open={showClearConfirm}
        title="Clear All Items"
        message="Do you really want to clear the items?"
        variant="alert"
        confirmLabel="Clear All"
        onConfirm={() => {
          setBillingItems([]);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}
