'use client';

import {MenuItem as TypeMenuItem} from "@/types/menu";
import MenuAdd from "@/components/MenuAdd";
import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import CategoryMenuItem from "@/components/CategoryMenuItem";

export default function MenuPage() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  const [categoryWithMenuItems, setCategoryWithMenuItems] = useState<TypeCategoryWithMenuItem[]>([]);
  const [editingMenu, setEditingMenu] = useState<TypeMenuItem | null>(null);

  async function getMenuItems(): Promise<void> {
    setIsPageLoading(true);

    const response: Response = await fetch(`/api/categories/with_menu_items?get_all=true`, {
      next: {revalidate: 3600} // Revalidate every hour
    });

    const data: TypeApiListResponse<TypeCategoryWithMenuItem> = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch blog post');
    }

    setCategoryWithMenuItems(data.data);
    setIsPageLoading(false);
  }

  useEffect(() => {
    getMenuItems().then(r => console.log(r));
  }, []);

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <MenuAdd
        isEditing={!!editingMenu}
        menuItem={editingMenu}
        clearForm={() => setEditingMenu(null)}
        refreshMenuItems={() => getMenuItems()}
      />

      <div className="container mx-auto px-4 mt-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700">
        <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Manage Menu Item
        </h1>

        {isPageLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({length: 3}).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl animate-pulse">
                {/* Category header skeleton */}
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                {/* Menu item cards skeleton */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 px-5 pb-5">
                  {Array.from({length: 3}).map((_, j) => (
                    <div key={j} className="shadow-lg border-2 border-solid border-[#f0e6dd] dark:border-gray-600 rounded-2xl p-4.5 bg-[#fffbf6] dark:bg-gray-950 flex justify-between items-center">
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-3.5 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {categoryWithMenuItems.map((categoryWithMenuItem: TypeCategoryWithMenuItem) => (
              <CategoryMenuItem
                key={categoryWithMenuItem.id}
                categoryWithMenuItem={categoryWithMenuItem}
                menuItemEditAction={(menu: TypeMenuItem) => {
                  setEditingMenu(menu);
                  window.scrollTo(0, 0)
                }}
                refreshMenuItems={() => {
                  getMenuItems().then(r => console.log(r));
                  setEditingMenu(null)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
