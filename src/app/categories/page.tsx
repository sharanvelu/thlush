'use client';

import {Category as TypeCategory} from "@/types/category";
import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import Category from "@/components/Category";
import CategoryAdd from "@/components/CategoryAdd";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";

export default function CategoryPage() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  const [categories, setCategories] = useState<TypeCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<TypeCategory | null>(null);

  async function getCategories(): Promise<void> {
    setIsPageLoading(true);

    const response: Response = await fetch(`/api/categories`, {
      next: {revalidate: 3600} // Revalidate every hour
    });

    const data: TypeApiListResponse<TypeCategory> = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch blog post');
    }

    setCategories(data.data);
    setIsPageLoading(false);
  }

  useEffect(() => {
    getCategories().then(r => console.log(r));
  }, []);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise your menu into sections."
        actions={
          <CategoryAdd
            isEditing={!!editingCategory}
            category={editingCategory}
            clearForm={() => setEditingCategory(null)}
            refreshCategories={() => getCategories()}
          />
        }
      />

      {isPageLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="card card-pad flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-32"></div>
                <div className="skeleton h-5 w-14"></div>
              </div>
              <div className="skeleton h-3 w-48 max-w-full"></div>
              <div className="flex justify-end gap-2">
                <div className="skeleton h-7 w-7"></div>
                <div className="skeleton h-7 w-7"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {categories.length == 0 && (
            <div className="card empty">
              <Icon name="tag" size={28} className="text-ink-4"/>
              <p className="font-medium text-ink">No categories yet</p>
              <p className="text-[13px]">Use Add category to create your first one.</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category: TypeCategory, index: number) => (
              <div key={category.id} className="rise flex" style={{animationDelay: `${Math.min(index, 8) * 30}ms`}}>
                <Category
                  category={category}
                  editAction={(category: TypeCategory) => {
                    setEditingCategory(category);
                    window.scrollTo(0, 0)
                  }}
                  refreshCategories={() => {
                    getCategories().then(r => console.log(r));
                    setEditingCategory(null)
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
