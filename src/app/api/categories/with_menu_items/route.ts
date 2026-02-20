import {NextResponse} from 'next/server';
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {CategoryService} from "@/services/CategoryService";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";

export async function GET(): Promise<NextResponse<TypeApiListResponse<TypeCategoryWithMenuItem>>> {
  const menuItems: TypeCategoryWithMenuItem[] = await CategoryService.getCategoryWithMenuItem();

  return NextResponse.json({
    success: true,
    data: menuItems,
  });
}
