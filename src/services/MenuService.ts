import {SupabaseService} from "@/services/SupabaseService.server";
import {MenuItem as TypeMenuItem} from "@/types/menu";

export const MenuService = {
  getAllMenuItems: async (): Promise<{ menu_items: TypeMenuItem[] }> => {
    const supabase = await SupabaseService.getServerClient();

    // Get paginated blog posts
    const {data: menuItems, error} = await supabase
      .from('thlush_menu_items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', {ascending: false});

    if (error) {
      console.error('Error fetching menu items from Supabase:', error);
      throw error;
    }

    return {
      menu_items: await MenuService.formatMenuItems(menuItems),
    };
  },

  formatMenuItem: async (menuItem: TypeMenuItem | null): Promise<TypeMenuItem | null> => {
    if (menuItem) {
      // If MenuItem cover_image is uploaded to S3, then generate a preSigned URL
      // if (menuItem?.cover_image?.startsWith('blogs/images')) {
      //   menuItem.cover_image_original = menuItem.cover_image;
      //   menuItem.cover_image = await S3Service.generatePreSignedDownloadUrl(menuItem.cover_image);
      // }
    }

    return menuItem;
  },

  formatMenuItems: async (menuItems: TypeMenuItem[]): Promise<TypeMenuItem[]> => {
    return await Promise.all(
      menuItems.map(async (blogPost: TypeMenuItem): Promise<TypeMenuItem> => {
        return await MenuService.formatMenuItem(blogPost) as TypeMenuItem;
      })
    );
  },
};
