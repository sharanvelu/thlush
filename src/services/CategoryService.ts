import {SupabaseService} from "@/services/SupabaseService.server";
import {
  Category as TypeCategory,
  CategoryDto as TypeCategoryDto,
  CategoryStatus,
  CategoryWithMenuItem
} from "@/types/category";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import {MenuService} from "@/services/MenuService";

export const CategoryService = {
  getAllCategories: async (): Promise<TypeCategory[]> => {
    const supabase = await SupabaseService.getServerClient();

    // Get All Categories
    const {data: categories, error} = await supabase
      .from('thlush_categories')
      .select('*')
      .order('created_at', {ascending: true});

    if (error) {
      console.error('Error fetching categories from Supabase:', error);
      throw error;
    }

    return await CategoryService.formatCategories(categories);
  },

  getCategoryWithMenuItem: async (getAll: boolean = false): Promise<TypeCategoryWithMenuItem[]> => {
    const supabase = await SupabaseService.getServerClient();

    // Get All Categories
    const {data: categories, error} = await supabase
      .from('thlush_categories')
      .select('*')
      .in('status', getAll ? [CategoryStatus.ACTIVE, CategoryStatus.DISABLE] : [CategoryStatus.ACTIVE])
      .order('created_at', {ascending: true});

    if (error) {
      console.error('Error fetching categories from Supabase:', error);
      throw error;
    }

    const menuItems: TypeMenuItem[] = await MenuService.getAllMenuItems(getAll);

    return (await CategoryService.formatCategories(categories))
      .map((category: TypeCategory): TypeCategoryWithMenuItem => {
        const categoryWithMenuItems = category as CategoryWithMenuItem;

        categoryWithMenuItems.menu_items = menuItems.filter(
          (menuItem: TypeMenuItem) => menuItem.category_id === category.id
        );

        return categoryWithMenuItems;
      })
      .filter((category: TypeCategoryWithMenuItem) => getAll || (category.menu_items.length > 0));
  },

  formatCategories: async (categories: TypeCategory[]): Promise<TypeCategory[]> => {
    return await Promise.all(
      categories.map(async (category: TypeCategory): Promise<TypeCategory> => {
        return await CategoryService.formatCategory(category) as TypeCategory;
      })
    );
  },

  formatCategory: async (category: TypeCategory): Promise<TypeCategory> => {
    // If Category cover_image is uploaded to S3, then generate a preSigned URL
    // if (category?.cover_image?.startsWith('blogs/images')) {
    //   category.cover_image_original = category.cover_image;
    //   category.cover_image = await S3Service.generatePreSignedDownloadUrl(category.cover_image);
    // }

    return category;
  },

  createCategory: async (categoryDto: TypeCategoryDto): Promise<TypeCategory> => {
    const supabase = await SupabaseService.getServerClient();

    const {data: category, error} = await supabase
      .from('thlush_categories')
      .insert([categoryDto])
      .select()
      .single();

    if (error) {
      console.error('Error creating Category:', error);
      throw new Error('Failed to create Category');
    }

    return await CategoryService.formatCategory(category);
  },

  updateCategory: async (id: number, categoryDto: TypeCategoryDto): Promise<TypeCategory> => {
    const supabase = await SupabaseService.getServerClient();

    const {data: category, error} = await supabase
      .from('thlush_categories')
      .update(categoryDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating Category:', error);
      throw new Error('Failed to update Category');
    }

    return await CategoryService.formatCategory(category);
  },

  deleteCategory: async (id: number) => {
    const supabase = await SupabaseService.getServerClient();

    const {error} = await supabase
      .from('thlush_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting Category:', error);
      throw new Error('Failed to delete Category');
    }

    return true;
  },
};
