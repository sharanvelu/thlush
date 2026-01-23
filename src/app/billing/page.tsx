'use client';

import Navbar from '@/components/Navbar';
import BillingItem from "@/components/BillingItem";
import {useState} from "react";
import {MenuItem} from "@/types/menu";
import {MenuItems as MenuItemsData} from "@/data/MenuItem";
import InputField from "@/components/Inputs/Input";

export default function SetupPage() {
  const [customerName, setCustomerName] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const filterItems = (value: string) => {
    setFilterValue(value)
  }

  return (
    <>
      <Navbar/>
      <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
          <div className="text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              New Bill
            </h1>
          </div>

          <div className="mt-10 space-y-12">
            <div
              className="bg-[#fffbf6] dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
              <div className="mb-4">
                <label className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm">
                  Customer Name:
                </label>
                <input
                  className="max-w-100 w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-600 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
                  type="text"
                  placeholder="Enter customer name (optional)"
                  style={{transition: "border-color 0.2s"}}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-gray-100 dark:bg-gray-900 px-4 py-6 rounded-2xl border-2 border-[#f0e6dd] dark:border-gray-600">
              <InputField
                id="filter"
                title="Filter"
                placeholder="Filter Items"
                value={filterValue}
                onchange={(e) => filterItems(e.target.value)}
              />
              <section className="grid gap-4.5" style={{gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"}}>
                {MenuItemsData.map((menuItem: MenuItem) => (
                  <BillingItem key={menuItem.id} menu={menuItem} defaultCount={0}/>
                ))}
              </section>
            </div>

            <section className="mt-8 pt-6 border-t border-dashed border-[#e0d7cf] grid gap-3.5 items-center"
                     style={{gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"}}>
              <div className="text-sm text-[#555] dark:text-gray-300 min-h-15">
                No food items selected yet. <br/>
              </div>
              <div className="text-[14px] text-[#5c5c68] dark:text-gray-300 mb-2 min-h-5">
                {customerName !== '' && (
                  <><span className="text-[16px] font-extrabold">Customer:</span> {customerName}</>
                )}
              </div>

              <div className="flex flex-col justify-between text-xl font-bold h-full">
                <div className="py-5">
                  Grand Total: ₹<span id="totalAmount">0.00</span>
                </div>
                <div className="flex flex-col gap-3 flex-wrap">
                  <button
                    className="flex-1 min-w-40 rounded-[14px] px-5 py-3.5 text-[15px] font-semibold border-2 border-solid border-[#ffb347] text-[#ff7a18] bg-transparent cursor-pointer"
                  >Clear All
                  </button>
                  <button
                    className="flex-1 min-w-45 border-none rounded-2xl px-5 py-3.5 text-[16px] font-semibold -bg-linear-120 from-[#ff7a18] to-[#ffb347] text-white cursor-pointer"
                    style={{boxShadow: "0 12px 25px rgba(255,122,24,.3)"}}
                  >Print Invoice
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
