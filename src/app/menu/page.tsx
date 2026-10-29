'use client';

import {MenuItem as TypeMenuItem} from "@/types/menu";
import MenuAdd from "@/components/MenuAdd";
import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import CategoryMenuItem from "@/components/CategoryMenuItem";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

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
    <>
      <PageHeader
        title="Menu"
        description="Items grouped by category. Prices shown include tax."
        actions={
          <MenuAdd
            isEditing={!!editingMenu}
            menuItem={editingMenu}
            clearForm={() => setEditingMenu(null)}
            refreshMenuItems={() => getMenuItems()}
          />
        }
      />

      {isPageLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="card">
              <div className="card-head">
                <div className="skeleton h-4 w-32"></div>
                <div className="skeleton h-5 w-14"></div>
              </div>
              {Array.from({length: 3}).map((_, j) => (
                <div key={j} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="skeleton h-4 w-40 max-w-full"></div>
                    <div className="skeleton h-3 w-56 max-w-full"></div>
                  </div>
                  <div className="skeleton h-4 w-16"></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : categoryWithMenuItems.length === 0 ? (
        <div className="card empty">
          <Icon name="utensils" size={28} className="text-ink-4"/>
          <p className="font-medium text-ink">No menu yet</p>
          <p className="text-[13px]">Add a category first, then add your first menu item.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {categoryWithMenuItems.map((categoryWithMenuItem: TypeCategoryWithMenuItem, index: number) => (
            <div key={categoryWithMenuItem.id} className="rise" style={{animationDelay: `${Math.min(index, 6) * 30}ms`}}>
              <CategoryMenuItem
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
            </div>
          ))}
        </div>
      )}
    </>
  );
}
