import { z } from "zod";
import { ROLES } from "@/config/permissions";

/** bcrypt only reads the first 72 bytes, so longer passwords would be silently cut. */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

const name = z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer");
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(160));
const role = z.enum(ROLES);

export const createUserSchema = z.object({ name, email, role, password: passwordSchema });
export type CreateUserInput = z.output<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: name.optional(),
  email: email.optional(),
  role: role.optional(),
  /** Setting a password resets it. Left out, the current one stays. */
  password: passwordSchema.optional(),
});
export type UpdateUserInput = z.output<typeof updateUserSchema>;

export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).transform((v) => v || undefined).optional().catch(undefined),
  role: role.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20).default(20),
});
export type UserListQuery = z.output<typeof userListQuerySchema>;

export const profileSchema = z.object({
  name: name.optional(),
  email: email.optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
});
export type ProfileInput = z.output<typeof profileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(200),
  newPassword: passwordSchema,
});
