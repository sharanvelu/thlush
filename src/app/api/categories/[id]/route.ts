import {NextResponse} from 'next/server';
import {SupabaseService} from "@/services/SupabaseService.server";
import {CategoryService} from '@/services/CategoryService';
import {ApiDeleteResponse, ApiResponse} from "@/types/global";
import {Category as TypeCategory, CategoryDto as TypeCategoryDto} from "@/types/category";

// Update a specific Category
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; }>; },
): Promise<NextResponse<ApiResponse<TypeCategory>>> {
  // Check authentication
  if (!await SupabaseService.authUser()) {
    NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const {id} = await context.params

  if (isNaN(parseInt(id))) {
    return NextResponse.json(
      {success: false, error: 'Invalid Category ID'},
      {status: 400}
    );
  }

  const data: TypeCategoryDto = await request.json();

  const updatedCategory: TypeCategory = await CategoryService.updateCategory(parseInt(id), data);

  return NextResponse.json({
    success: true,
    data: updatedCategory,
  });
}

// Delete a specific Category
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; }>; }
): Promise<NextResponse<ApiDeleteResponse>> {
  // Check authentication
  if (!await SupabaseService.checkAuth()) {
    NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const {id}: { id: string } = await context.params

  if (isNaN(parseInt(id))) {
    return NextResponse.json(
      {success: false, error: 'Invalid category ID'},
      {status: 400}
    );
  }

  await CategoryService.deleteCategory(parseInt(id));

  return NextResponse.json({
    success: true,
    message: 'Category deleted successfully',
  });
}