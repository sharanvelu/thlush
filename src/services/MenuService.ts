import {SupabaseService} from "@/services/SupabaseService.server";
import {MenuItem as TypeMenuItem, MenuItemDto as TypeMenuItemDto} from "@/types/menu";

export const MenuService = {
  getAllMenuItems: async (): Promise<TypeMenuItem[]> => {
    const supabase = await SupabaseService.getServerClient();

    // Get All Menu Items
    const {data: menuItems, error} = await supabase
      .from('thlush_menu_items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', {ascending: false});

    if (error) {
      console.error('Error fetching menu items from Supabase:', error);
      throw error;
    }

    return await MenuService.formatMenuItems(menuItems);
  },

  formatMenuItems: async (menuItems: TypeMenuItem[]): Promise<TypeMenuItem[]> => {
    return await Promise.all(
      menuItems.map(async (menuItem: TypeMenuItem): Promise<TypeMenuItem> => {
        return await MenuService.formatMenuItem(menuItem) as TypeMenuItem;
      })
    );
  },

  formatMenuItem: async (menuItem: TypeMenuItem): Promise<TypeMenuItem> => {
    // If MenuItem cover_image is uploaded to S3, then generate a preSigned URL
    // if (menuItem?.cover_image?.startsWith('blogs/images')) {
    //   menuItem.cover_image_original = menuItem.cover_image;
    //   menuItem.cover_image = await S3Service.generatePreSignedDownloadUrl(menuItem.cover_image);
    // }

    return menuItem;
  },

  createMenuItem: async (menuItemDto: TypeMenuItemDto): Promise<TypeMenuItem> => {
    console.log({menuItemDto});
    const supabase = await SupabaseService.getServerClient();

    const {data: menuItem, error} = await supabase
      .from('thlush_menu_items')
      .insert([menuItemDto])
      .select()
      .single();

    if (error) {
      console.error('Error creating Menu Item:', error);
      throw new Error('Failed to create Menu Item');
    }

    return await MenuService.formatMenuItem(menuItem);
  },

  updateMenuItem: async (id: number, menuItemDto: TypeMenuItemDto): Promise<TypeMenuItem> => {
    const supabase = await SupabaseService.getServerClient();

    const {data: menuItem, error} = await supabase
      .from('thlush_menu_items')
      .update(menuItemDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating Menu item:', error);
      throw new Error('Failed to update Menu item');
    }

    return await MenuService.formatMenuItem(menuItem);
  },

  deleteMenuItem: async (id: number) => {
    const supabase = await SupabaseService.getServerClient();

    const {error} = await supabase
      .from('thlush_menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting Menu Item:', error);
      throw new Error('Failed to delete Menu Item');
    }

    return true;
  },
};
