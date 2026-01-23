export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  tax: number;
  cgst: number;
  sgst: number;
  currency: string;
}

export interface MenuItemDto {
  name: string;
  description: string | null;
  price: number;
  tax: number;
  cgst: number;
  sgst: number;
  currency: string;
}
