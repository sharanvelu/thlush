/** Pagination metadata returned by every list endpoint. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  pagination?: Pagination;
}

export interface ApiFailure {
  success: false;
  error: string;
  /** Field-level validation messages, keyed by field path. */
  fieldErrors?: Record<string, string[]>;
}

/** The envelope every API route returns. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
