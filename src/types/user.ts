export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  BILLING = 'billing',
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.BILLING]: 'Billing',
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}
