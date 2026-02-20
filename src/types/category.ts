import {MenuItem} from "@/types/menu";

export enum CategoryStatus {
  ACTIVE = 'active',
  DISABLE = 'disable',
}

export interface CategoryDto {
  name: string;
  description: string | null;
  status: CategoryStatus;
}

export interface Category extends CategoryDto {
  id: number;
}


export interface CategoryWithMenuItem extends Category {
  menu_items: MenuItem[];
}
