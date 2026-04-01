'use client';

import {Category as TypeCategory} from "@/types/category";
import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import Category from "@/components/Category";
import CategoryAdd from "@/components/CategoryAdd";

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
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <CategoryAdd
        isEditing={!!editingCategory}
        category={editingCategory}
        clearForm={() => setEditingCategory(null)}
        refreshCategories={() => getCategories()}
      />

      <div className="container mx-auto px-4 mt-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700">
        <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Manage Category
        </h1>

        {isPageLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({length: 6}).map((_, i) => (
              <div
                key={i}
                className="relative shadow-lg border-2 border-solid border-[#f0e6dd] dark:border-gray-600 rounded-2xl p-4.5 bg-[#fffbf6] dark:bg-gray-950 flex justify-between items-center animate-pulse"
              >
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3.5 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {categories.length == 0 && (
              <p className="empty-message">No Categories. Add your first category above!</p>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((category: TypeCategory) => (
                <Category
                  key={category.id}
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
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
