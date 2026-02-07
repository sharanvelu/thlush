import {NextResponse} from 'next/server';
import {MenuService} from '@/services/MenuService';
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";

export async function GET(): Promise<NextResponse<TypeApiListResponse<TypeMenuItem>>> {
  const {menu_items}: { menu_items: TypeMenuItem[] } = await MenuService.getAllMenuItems();

  return NextResponse.json({
    success: true,
    data: menu_items,
  });
}
