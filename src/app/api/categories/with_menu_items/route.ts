import {NextRequest, NextResponse} from 'next/server';
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {CategoryService} from "@/services/CategoryService";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";

export async function GET(request: NextRequest): Promise<NextResponse<TypeApiListResponse<TypeCategoryWithMenuItem>>> {
  const getAllParam: string | null = request.nextUrl.searchParams.get("get_all");

  const menuItems: TypeCategoryWithMenuItem[] = await CategoryService.getCategoryWithMenuItem(getAllParam === "true");

  return NextResponse.json({
    success: true,
    data: menuItems,
  });
}
