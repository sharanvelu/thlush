import {NeonService} from "@/services/NeonService";
import {DatabaseService} from "@/services/DatabaseService";
import {MenuItem as TypeMenuItem, MenuItemDto as TypeMenuItemDto, MenuItemStatus} from "@/types/menu";
import {NeonQueryFunction} from "@neondatabase/serverless";

const table_name: string = DatabaseService.table_names.menu_items;

export const MenuService = {
  getAllMenuItems: async (getAll: boolean = false): Promise<TypeMenuItem[]> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const statuses: MenuItemStatus[] = getAll
      ? [MenuItemStatus.ACTIVE, MenuItemStatus.DISABLE]
      : [MenuItemStatus.ACTIVE];

    const menuItems = await sql.query(
      `SELECT *
       FROM ${table_name}
       WHERE status = ANY ($1)
       ORDER BY created_at ASC`,
      [statuses]
    );

    return menuItems as TypeMenuItem[];
  },

  createMenuItem: async (menuItemDto: TypeMenuItemDto, userId: string): Promise<TypeMenuItem> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [menuItem] = await sql.query(
      `INSERT INTO ${table_name} (name, description, category_id, price, sgst, cgst, currency, status, created_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        menuItemDto.name,
        menuItemDto.description,
        menuItemDto.category_id,
        menuItemDto.price,
        menuItemDto.sgst ?? null,
        menuItemDto.cgst ?? null,
        menuItemDto.currency,
        menuItemDto.status,
        userId,
      ]
    );

    return menuItem as TypeMenuItem;
  },

  updateMenuItem: async (id: number, menuItemDto: TypeMenuItemDto): Promise<TypeMenuItem> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [menuItem] = await sql.query(
      `UPDATE ${table_name}
       SET name        = $1,
           description = $2,
           category_id = $3,
           price       = $4,
           sgst        = $5,
           cgst        = $6,
           currency    = $7,
           status      = $8
       WHERE id = $9 RETURNING *`,
      [
        menuItemDto.name,
        menuItemDto.description,
        menuItemDto.category_id,
        menuItemDto.price,
        menuItemDto.sgst ?? null,
        menuItemDto.cgst ?? null,
        menuItemDto.currency,
        menuItemDto.status,
        id,
      ]
    );

    if (!menuItem) {
      throw new Error('Failed to update Menu item');
    }

    return menuItem as TypeMenuItem;
  },

  deleteMenuItem: async (id: number) => {
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
