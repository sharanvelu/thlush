export enum MenuItemStatus {
  ACTIVE = 'active',
  DISABLE = 'disable',
}

export interface MenuItemDto {
  name: string;
  description: string | null;
  price: number;
  sgst?: number;
  cgst?: number;
  currency: string;
  status?: MenuItemStatus;
}

export interface MenuItem extends MenuItemDto {
  id: number;
}
