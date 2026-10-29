import type { Role } from "@/config/permissions";

/**
 * Demo accounts created by `npm run db:seed`. The login page only offers them
 * when NEXT_PUBLIC_APP_ENV is "local"; they are never sent to the browser otherwise.
 */
export interface DemoUser {
  name: string;
  email: string;
  role: Role;
}

export const DEMO_USERS: readonly DemoUser[] = [
  { name: "Asha Admin", email: "admin@thlush.local", role: "super_admin" },
  { name: "Manoj Manager", email: "manager@thlush.local", role: "manager" },
  { name: "Charu Cashier", email: "cashier@thlush.local", role: "billing" },
];

export const DEFAULT_SEED_PASSWORD = "Password@123";

/** Password given to demo users by the seed script. Server-side only. */
export function seedPassword(): string {
  const value = process.env.SEED_PASSWORD?.trim();
  return value ? value : DEFAULT_SEED_PASSWORD;
}
