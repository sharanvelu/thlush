export interface AdminUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
}
