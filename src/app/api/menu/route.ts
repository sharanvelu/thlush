import {NextResponse} from 'next/server';
import {MenuService} from '@/services/MenuService';
import {MenuItem as TypeMenuItem, MenuItemDto as TypeMenuItemDto} from "@/types/menu";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {AuthService, AuthUser} from "@/services/AuthService";

export async function GET(): Promise<NextResponse<TypeApiListResponse<TypeMenuItem>>> {
  const menuItems: TypeMenuItem[] = await MenuService.getAllMenuItems();

  return NextResponse.json({
    success: true,
    data: menuItems,
  });
}

export async function POST(request: Request): Promise<NextResponse<TypeApiResponse<TypeMenuItem>>> {
  // Check authentication
  const authUser: AuthUser | null = await AuthService.getAuthUser();

  if (!authUser) {
    return NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const menuItemDto: TypeMenuItemDto = await request.json();

  const menuItem: TypeMenuItem = await MenuService.createMenuItem(menuItemDto, authUser.id);

  return NextResponse.json({
    success: true,
    data: menuItem,
  });
}
