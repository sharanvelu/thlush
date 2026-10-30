import type { Role } from "@/config/permissions";

export type { Role } from "@/config/permissions";

/** The user shape carried in the session and returned by `/api/me`. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Saved appearance choice; applied on devices that have not picked one yet. */
  themePreference?: "light" | "dark" | "system";
}

/** Full profile as stored in the database, minus secrets. */
export interface UserProfile extends SessionUser {
  themePreference: "light" | "dark" | "system";
  createdAt: Date;
  lastLoginAt: Date | null;
  hasPassword: boolean;
}
