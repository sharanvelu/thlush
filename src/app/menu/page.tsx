'use client';

import {MenuItem as TypeMenuItem} from "@/types/menu";
import {MenuItems as MenuItemsData} from "@/data/MenuItem";
import MenuAdd from "@/components/MenuAdd";
import MenuItem from "@/components/MenuItem";
import {useState} from "react";

export default function MenuPage() {
  const [editingMenu, setEditingMenu] = useState<TypeMenuItem | null>(null);

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Manage Menu
          </h1>
        </div>

        <div className="mt-10 space-y-12">
          <MenuAdd
            isEditing={!!editingMenu}
            menuItem={editingMenu}
            clearForm={() => setEditingMenu(null)}
          />

          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 mb-8">
            <h3 className="m-0 mb-5">Manage Menu Item</h3>
            {/*<p class="empty-message">No menu items. Add your first item above!</p>*/}

            <div className="grid grid-cols-3 gap-4">
              {MenuItemsData.map((menuItem: TypeMenuItem) => (
                <MenuItem
                  key={menuItem.id}
                  menu={menuItem}
                  editAction={(menu: TypeMenuItem) => {
                    setEditingMenu(menu);
                    window.scrollTo(0, 0)
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
