export interface Pagination {
  current_page: number;
  items_per_page: number;
  total_pages: number;
  total_items: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface PaginatedResponse<T> {
  success: true,
  data: T[];
  pagination?: Pagination;
}

export interface SuccessResponse<T> {
  success: true;
  data: T | null;
  message?: string;
}

export interface DeleteSuccessResponse {
  success: true;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiListResponse<T> = PaginatedResponse<T> | ErrorResponse;

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export type ApiDeleteResponse = DeleteSuccessResponse | ErrorResponse;
