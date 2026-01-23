'use client';

import Navbar from '@/components/Navbar';
import {useState} from "react";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {MenuItems as MenuItemsData} from "@/data/MenuItem";
import MenuAdd from "@/components/MenuAdd";
import MenuItem from "@/components/MenuItem";

export default function SetupPage() {
  return (
    <>
      <Navbar/>
      <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
          <div className="text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Manage Menu
            </h1>
          </div>

          <div className="mt-10 space-y-12">
            <MenuAdd isEditing={true} />

            <div
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 mb-8">
              <h3 className="m-0 mb-5">Remove New Menu Item</h3>
              {/*<p class="empty-message">No menu items. Add your first item above!</p>*/}

              {MenuItemsData.map((menuItem: TypeMenuItem) => (
                <MenuItem key={menuItem.id} menu={menuItem} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
