export const MenuItemActive = 'active';
export const MenuItemDisable = 'disable';

export interface MenuItemDto {
  name: string;
  description: string | null;
  price: number;
  tax: number;
  sgst: number;
  cgst: number;
  total: number;
  currency: string;
  status?: 'active' | 'disable';
}

export interface MenuItem extends MenuItemDto {
  id: number;
}
