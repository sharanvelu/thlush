export const MenuItemActive = 'active';
export const MenuItemDisable = 'disable';

export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  tax: number;
  sgst: number;
  cgst: number;
  currency: string;
  status?: 'active' | 'disable';
}

export interface MenuItemDto {
  name: string;
  description: string | null;
  price: number;
  tax: number;
  sgst: number;
  cgst: number;
  currency: string;
  status?: 'active' | 'disable';
}
