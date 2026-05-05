import {NeonService} from "@/services/NeonService";
import {DatabaseService} from "@/services/DatabaseService";
import {AdminUser as TypeAdminUser, CreateUserDto as TypeCreateUserDto, UpdateUserDto as TypeUpdateUserDto, UserRole} from "@/types/user";
import {NeonQueryFunction} from "@neondatabase/serverless";
import bcrypt from 'bcryptjs';

const table_name: string = DatabaseService.table_names.users;

interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: string;
  last_login_at: string | null;
}

function toAdminUser(row: UserRow): TypeAdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    last_sign_in_at: row.last_login_at,
  };
}

export const UserService = {
  getUser: async (id: string): Promise<TypeAdminUser> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [user] = await sql.query(
      `SELECT * FROM ${table_name} WHERE id = $1`,
      [id]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return toAdminUser(user as UserRow);
  },

  listUsers: async (): Promise<TypeAdminUser[]> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const users = await sql.query(
      `SELECT * FROM ${table_name} ORDER BY created_at ASC`
    );

    return (users as UserRow[]).map(toAdminUser);
  },

  createUser: async (dto: TypeCreateUserDto): Promise<TypeAdminUser> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const existingUsers = await sql.query(
      `SELECT id FROM ${table_name} WHERE email = $1`,
      [dto.email]
    );

    if (existingUsers.length > 0) {
      throw new Error('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const [user] = await sql.query(
      `INSERT INTO ${table_name} (name, email, password, role)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [dto.name, dto.email, hashedPassword, dto.role]
    );

    return toAdminUser(user as UserRow);
  },

  updateUser: async (id: string, dto: TypeUpdateUserDto): Promise<TypeAdminUser> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(dto.name);
    }

    if (dto.email) {
      const existingUsers = await sql.query(
        `SELECT id FROM ${table_name} WHERE email = $1 AND id != $2`,
        [dto.email, id]
      );

      if (existingUsers.length > 0) {
        throw new Error('A user with this email already exists');
      }

      setClauses.push(`email = $${paramIndex++}`);
      params.push(dto.email);
    }

    if (dto.password) {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      setClauses.push(`password = $${paramIndex++}`);
      params.push(hashedPassword);
    }

    if (dto.role) {
      setClauses.push(`role = $${paramIndex++}`);
      params.push(dto.role);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);

    const [user] = await sql.query(
      `UPDATE ${table_name} SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (!user) {
      throw new Error('User not found');
    }

    return toAdminUser(user as UserRow);
  },

  deleteUser: async (id: string): Promise<void> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const result = await sql.query(
      `DELETE FROM ${table_name} WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.length === 0) {
      throw new Error('User not found');
    }
  },

  authenticateUser: async (email: string, password: string): Promise<UserRow | null> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [user] = await sql.query(
      `SELECT * FROM ${table_name} WHERE email = $1`,
      [email]
    );

    if (!user) {
      return null;
    }

    const row = user as UserRow;
    const isValid = await bcrypt.compare(password, row.password);

    if (!isValid) {
      return null;
    }

    await sql.query(
      `UPDATE ${table_name} SET last_login_at = now() WHERE id = $1`,
      [row.id]
    );

    return row;
  },
};
