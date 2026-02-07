import {NextResponse} from 'next/server';
import {SupabaseService} from "@/services/SupabaseService.server";
import {MenuService} from '@/services/MenuService';
import {ApiDeleteResponse, ApiResponse} from "@/types/global";
import {MenuItem as TypeMenuItem, MenuItemDto as TypeMenuItemDto} from "@/types/menu";

// Update a specific Menu Item
export async function PUT(
  request: Request,
  {params}: { params: Promise<{ id: number }> }
): Promise<NextResponse<ApiResponse<TypeMenuItem>>> {
  // Check authentication
  if (!await SupabaseService.authUser()) {
    NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const {id}: { id: number } = await params
  if (isNaN(id)) {
    return NextResponse.json(
      {success: false, error: 'Invalid Menu Item ID'},
      {status: 400}
    );
  }

  const data: TypeMenuItemDto = await request.json();

  const updatedMenuItem: TypeMenuItem = await MenuService.updateMenuItem(id, data);

  return NextResponse.json({
    success: true,
    data: updatedMenuItem,
  });
}

// Delete a specific Menu Item
export async function DELETE({params}: { params: Promise<{ id: number }> }): Promise<NextResponse<ApiDeleteResponse>> {
  // Check authentication
  if (!await SupabaseService.checkAuth()) {
    NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const {id}: { id: number } = await params
  if (isNaN(id)) {
    return NextResponse.json(
      {success: false, error: 'Invalid menu item ID'},
      {status: 400}
    );
  }

  await MenuService.deleteMenuItem(id);

  return NextResponse.json({
    success: true,
    message: 'Menu Item deleted successfully',
  });
}