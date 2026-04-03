import {createClient} from '@supabase/supabase-js';
import {AdminUser as TypeAdminUser, CreateUserDto as TypeCreateUserDto, UpdateUserDto as TypeUpdateUserDto} from "@/types/user";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {auth: {autoRefreshToken: false, persistSession: false}}
  );
}

export const UserService = {
  listUsers: async (): Promise<TypeAdminUser[]> => {
    const supabase = getAdminClient();

    const {data: {users}, error} = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      throw new Error('Failed to list users');
    }

    return users.map((user) => ({
      id: user.id,
      name: (user.user_metadata?.name as string) ?? '',
      email: user.email ?? '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
    }));
  },

  createUser: async (dto: TypeCreateUserDto): Promise<TypeAdminUser> => {
    const supabase = getAdminClient();

    const {data: {user}, error} = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {name: dto.name},
    });

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create user');
    }

    if (!user) {
      throw new Error('Failed to create user');
    }

    return {
      id: user.id,
      name: (user.user_metadata?.name as string) ?? '',
      email: user.email ?? '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
    };
  },

  updateUser: async (id: string, dto: TypeUpdateUserDto): Promise<TypeAdminUser> => {
    const supabase = getAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (dto.email) updateData.email = dto.email;
    if (dto.password) updateData.password = dto.password;
    if (dto.name !== undefined) updateData.user_metadata = {name: dto.name};

    const {data: {user}, error} = await supabase.auth.admin.updateUserById(id, updateData);

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message || 'Failed to update user');
    }

    if (!user) {
      throw new Error('Failed to update user');
    }

    return {
      id: user.id,
      name: (user.user_metadata?.name as string) ?? '',
      email: user.email ?? '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
    };
  },

  deleteUser: async (id: string): Promise<void> => {
    const supabase = getAdminClient();

    const {error} = await supabase.auth.admin.deleteUser(id);

    if (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  },
};
