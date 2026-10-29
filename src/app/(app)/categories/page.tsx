import type { Metadata } from "next";
import { CategoriesView } from "@/components/categories/categories-view";
import { Forbidden } from "@/components/layout/forbidden";
import { requireAccess } from "@/services/AuthService";
import { listCategories } from "@/services/CategoryService";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { allowed } = await requireAccess("categories.manage");
  if (!allowed) return <Forbidden />;

  const { rows } = await listCategories({ pageSize: 100 });
  return <CategoriesView categories={rows} />;
}
