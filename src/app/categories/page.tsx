'use client';

import {Category as TypeCategory} from "@/types/category";
import {useEffect, useState} from "react";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import Category from "@/components/Category";
import CategoryAdd from "@/components/CategoryAdd";
import Loader from "@/components/Loader";

export default function CategoryPage() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  const [categories, setCategories] = useState<TypeCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<TypeCategory | null>(null);

  async function getCategories(): Promise<void> {
    setIsPageLoading(true);

    const response: Response = await fetch(`/api/categories`, {
      next: { revalidate: 3600 } // Revalidate every hour
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

  if (isPageLoading) {
    return (
      <Loader/>
    );
  }

  return (
    <div className="min-h-screen py-20 pt-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 rounded-2xl sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Manage Category
          </h1>
        </div>

        <div className="mt-10 space-y-12">
          <CategoryAdd
            isEditing={!!editingCategory}
            category={editingCategory}
            clearForm={() => setEditingCategory(null)}
            refreshCategories={() => getCategories()}
          />

          <div
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 mb-8">
            <h3 className="m-0 mb-5">Manage Category</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
}
