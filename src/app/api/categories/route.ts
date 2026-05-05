import {NextResponse} from 'next/server';
import {CategoryService} from '@/services/CategoryService';
import {Category as TypeCategory, CategoryDto as TypeCategoryDto} from "@/types/category";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {AuthService, AuthUser} from "@/services/AuthService";

export async function GET(): Promise<NextResponse<TypeApiListResponse<TypeCategory>>> {
  const categories: TypeCategory[] = await CategoryService.getAllCategories();

  return NextResponse.json({
    success: true,
    data: categories,
  });
}

export async function POST(request: Request): Promise<NextResponse<TypeApiResponse<TypeCategory>>> {
  // Check authentication
  const authUser: AuthUser | null = await AuthService.getAuthUser();

  if (!authUser) {
    return NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const categoryItemDto: TypeCategoryDto = await request.json();

  const categoryItem: TypeCategory = await CategoryService.createCategory(categoryItemDto, authUser.id);

  return NextResponse.json({
    success: true,
    data: categoryItem,
  });
}
