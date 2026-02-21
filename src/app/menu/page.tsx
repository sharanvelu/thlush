'use client';

import {MenuItem as TypeMenuItem} from "@/types/menu";
import MenuAdd from "@/components/MenuAdd";
import MenuItem from "@/components/MenuItem";
import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import Loader from "@/components/Loader";
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

  if (isPageLoading) {
    return (
      <Loader/>
    );
  }

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
      </div>
    </div>
  );
}
