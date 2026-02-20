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

  if (isPageLoading) {
    return (
      <Loader/>
    );
  }

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
  );
}
