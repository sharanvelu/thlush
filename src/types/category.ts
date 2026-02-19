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
