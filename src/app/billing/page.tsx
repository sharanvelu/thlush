'use client';

import {useEffect, useMemo, useState} from "react";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {BillingItem as TypeBillingItem} from "@/types/billing";
import InputField from "@/components/Inputs/Input";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {calculateTotalTaxPriceValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import CategoryBillingItem from "@/components/CategoryBillingItem";

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [customerName, setCustomerName] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const [billingItems, setBillingItems] = useState<TypeBillingItem[]>([]);
  const [categoryWithMenuItems, setCategoryWithMenuItems] = useState<TypeCategoryWithMenuItem[]>([]);

  const filteredCategoryWithMenuItems: TypeCategoryWithMenuItem[] = useMemo(() => {
    if (!filterValue) return categoryWithMenuItems;

    return categoryWithMenuItems
      .map((categoryWithMenuItem: TypeCategoryWithMenuItem) => {
        const categoryMatches: boolean = (categoryWithMenuItem.name ?? "").toLowerCase().includes(filterValue);

        const matchingItems: TypeMenuItem[] = categoryWithMenuItem.menu_items.filter((menuItem: TypeMenuItem) =>
          (menuItem.name ?? "").toLowerCase().includes(filterValue)
        );

        // If category matches, return all items; otherwise only matching items
        return categoryMatches
          ? {...categoryWithMenuItem, menu_items: categoryWithMenuItem.menu_items}
          : {...categoryWithMenuItem, menu_items: matchingItems};
      })
      .filter(
        // keep categories that match OR have at least one matching item
        (categoryWithMenuItem: TypeCategoryWithMenuItem) =>
          (categoryWithMenuItem.name ?? "").toLowerCase().includes(filterValue) ||
          (categoryWithMenuItem.menu_items?.length ?? 0) > 0
      );
  }, [categoryWithMenuItems, filterValue]);

  async function getMenuItems(): Promise<void> {
    setIsLoading(true);

    const response: Response = await fetch(`/api/categories/with_menu_items`, {
      next: {revalidate: 3600} // Revalidate every hour
    });

    const data: TypeApiListResponse<TypeCategoryWithMenuItem> = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch blog post');
    }

    setCategoryWithMenuItems(data.data);
    setIsLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getMenuItems().then(r => console.log(r));
  }, []);

  const updateItem = (item: TypeBillingItem, quantity: number) => {
    setBillingItems((prev: TypeBillingItem[]) => {
      const idx: number = prev.findIndex((x: TypeBillingItem): boolean => x.id === item.id);

      if (idx !== -1) {
        // update existing
        const next: TypeBillingItem[] = [...prev];
        next[idx] = {...next[idx], quantity};
        return filterEmptyItem(next);
      }

      // add new
      return filterEmptyItem([...prev, {...item, quantity}]);
    });
  }

  const filterEmptyItem = (billingItems: TypeBillingItem[]): TypeBillingItem[] => {
    return billingItems.filter((billingItem: TypeBillingItem): boolean => billingItem.quantity > 0);
  }

  const calculateBillingItemPrice = (billingItem: TypeBillingItem): number => {
    return calculateTotalValue(billingItem.price, billingItem.sgst, billingItem.cgst, billingItem.quantity);
  }

  const totalBillingAmountWithoutTax = (): string => {
    return billingItems.reduce(
      (sum: number, billingItem: TypeBillingItem): number => sum + (billingItem.price * billingItem.quantity),
      0
    ).toFixed(2);
  }

  const totalTax = (): string => {
    return billingItems.reduce(
      (sum: number, billingItem: TypeBillingItem): number => sum + calculateTotalTaxPriceValue(billingItem.price, billingItem.sgst, billingItem.sgst, billingItem.quantity),
      0
    ).toFixed(2);
  }

  const totalBillingAmount = (): string => {
    return billingItems.reduce(
      (sum: number, billingItem: TypeBillingItem): number => sum + calculateBillingItemPrice(billingItem),
      0
    ).toFixed(2);
  }

  const clearBilling = () => {
    const confirmation: boolean = window.confirm('Do you really want to clear the items?')
    if (confirmation) {
      setBillingItems([])
    }
  }

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="md:px-[2%] mx-auto">
        <div className="lg:flex gap-4">
          <div className={`lg:w-3/4 space-y-12 lg:pb-0 ${billingItems.length > 0 ? 'pb-[25vh]' : ''}`}>
            {/* Billing Customer name */}
            <div
              className=" px-4 py-8 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800  border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
              <div className="mb-4 max-w-100">
                <InputField
                  id="customer_name"
                  title="Customer Name:"
                  placeholder="Enter customer name (optional)"
                  value={customerName}
                  onchange={(id: string, value: string | number) => setCustomerName(value + '')}
                  clearButton={true}
                />
              </div>
            </div>

            {/* Menu Items List */}
            <div
              className="bg-gray-50 dark:bg-gray-800 px-4 py-6 rounded-2xl border-2 border-[#f0e6dd] dark:border-gray-600">
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
                  <div
                    className="min-h-60 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-5 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl">
                    <div className="relative">
                      {/* Outer circle */}
                      <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
                      {/* Inner circle - blue spinning part */}
                      <div
                        className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {filteredCategoryWithMenuItems.map((categoryWithMenuItem: TypeCategoryWithMenuItem) => (
                      <CategoryBillingItem
                        key={categoryWithMenuItem.id}
                        categoryWithMenuItem={categoryWithMenuItem}
                        billingItems={billingItems}
                        updateBillingItemAction={updateItem}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bill Pricing Section */}
          <div
            className={`fixed bottom-0 lg:sticky lg:top-18.5 ${billingItems.length > 0 ? '' : 'hidden'} lg:block w-full lg:w-1/4 h-1/3 lg:h-2/5 overflow-auto p-6 mt-0 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 items-center bg-gray-50 dark:bg-gray-800 px-4 rounded-2xl`}>
            {customerName !== '' && (
              <div className="text-[14px] text-[#5c5c68] dark:text-gray-300 lg:mb-2 min-h-5 lg:pb-2 border-b">
                <><span className="text-[16px] font-extrabold">Customer:</span> {customerName}</>
              </div>
            )}

            <div className="text-sm text-[#555] dark:text-gray-300 min-h-15 lg:pb-2 border-b">
              {billingItems.map((billingItem: TypeBillingItem) => (
                <div key={billingItem.id} className="flex justify-between py-1">
                  <div className="w-3/6 px-1.5">
                    {billingItem.name}
                  </div>
                  <div className="w-1/6 px-1.5 text-right">
                    X {billingItem.quantity}
                  </div>
                  <div className="w-2/6 px-1.5 text-right">
                    {`${billingItem.currency} ${calculateBillingItemPrice(billingItem)}`}
                  </div>
                </div>
              ))}
              {billingItems.length == 0 && (
                <span>No food items selected yet. <br/></span>
              )}
            </div>

            <div className="flex flex-col justify-between text-sm lg:text-xl lg:font-bold lg:h-full">
              <div className="py-2 lg:py-5">
                <div className="flex">
                  {!shouldIgnoreTax() && (
                    <>
                      <div className="w-3/6 p-1.5">Price</div>
                      <div className="w-3/6 p-1.5">Tax</div>
                    </>
                  )}
                  <div className="w-3/6 p-1.5">Total</div>
                </div>
                <div className="flex">
                  {!shouldIgnoreTax() && (
                    <>
                      <div className="w-3/6 p-1.5">₹<span>{totalBillingAmountWithoutTax()}</span></div>
                      <div className="w-3/6 p-1.5">₹<span>{totalTax()}</span></div>
                    </>
                  )}
                  <div className="w-3/6 p-1.5">₹<span>{totalBillingAmount()}</span></div>
                </div>
              </div>
              <div className="flex flex-row gap-3 flex-wrap">
                <button
                  className="flex-1 min-w-40 rounded-[14px] px-5 py-2 text-[15px] font-semibold border-2 border-solid border-[#ffb347] text-[#ff7a18] bg-transparent cursor-pointer"
                  onClick={clearBilling}
                >Clear All
                </button>
                <button
                  className="flex-1 min-w-45 border-none rounded-2xl px-5 py-2 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer"
                  style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
                >Save Invoice
                </button>
                <button
                  className="flex-1 min-w-45 border-none rounded-2xl px-5 py-2 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer"
                  style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
                >Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
