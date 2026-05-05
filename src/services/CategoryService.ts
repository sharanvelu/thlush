import {NeonService} from "@/services/NeonService";
import {
  Category as TypeCategory,
  CategoryDto as TypeCategoryDto,
  CategoryStatus,
  CategoryWithMenuItem as TypeCategoryWithMenuItem
} from "@/types/category";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {MenuService} from "@/services/MenuService";
import {DatabaseService} from "@/services/DatabaseService";
import {NeonQueryFunction} from "@neondatabase/serverless";

const table_name: string = DatabaseService.table_names.categories;

export const CategoryService = {
  getAllCategories: async (): Promise<TypeCategory[]> => {
    const sql = NeonService.getClient();

    const categories = await sql.query(
      `SELECT *
       FROM ${table_name}
       ORDER BY created_at ASC`
    );

    return categories as TypeCategory[];
  },

  getCategoryWithMenuItem: async (getAll: boolean = false): Promise<TypeCategoryWithMenuItem[]> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const statuses: CategoryStatus[] = getAll
      ? [CategoryStatus.ACTIVE, CategoryStatus.DISABLE]
      : [CategoryStatus.ACTIVE];

    const categories = await sql.query(
      `SELECT *
       FROM ${table_name}
       WHERE status = ANY ($1)
       ORDER BY created_at ASC`,
      [statuses]
    );

    const menuItems: TypeMenuItem[] = await MenuService.getAllMenuItems(getAll);

    return (categories as TypeCategory[])
      .map((category: TypeCategory): TypeCategoryWithMenuItem => {
        return {
          ...category,
          menu_items: menuItems.filter(
            (menuItem: TypeMenuItem) => menuItem.category_id === category.id
          ),
        };
      })
      .filter((category: TypeCategoryWithMenuItem) => getAll || (category.menu_items.length > 0));
  },

  createCategory: async (categoryDto: TypeCategoryDto, userId: string): Promise<TypeCategory> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [category] = await sql.query(
      `INSERT INTO ${table_name} (name, description, status, created_user_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [categoryDto.name, categoryDto.description, categoryDto.status, userId]
    );

    return category as TypeCategory;
  },

  updateCategory: async (id: number, categoryDto: TypeCategoryDto): Promise<TypeCategory> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [category] = await sql.query(
      `UPDATE ${table_name}
       SET name        = $1,
           description = $2,
           status      = $3
       WHERE id = $4 RETURNING *`,
      [categoryDto.name, categoryDto.description, categoryDto.status, id]
    );

    if (!category) {
      throw new Error('Failed to update Category');
    }

    return category as TypeCategory;
  },

  deleteCategory: async (id: number) => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    await sql.query(
      `DELETE
       FROM ${table_name}
       WHERE id = $1`,
      [id]
    );

    return true;
  },
};
