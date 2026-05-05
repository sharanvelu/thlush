import {auth} from "@/auth";
import {UserRole} from "@/types/user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export const AuthService = {
  getAuthUser: async (): Promise<AuthUser | null> => {
    const session = await auth();

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    };
  },

  checkAuth: async (): Promise<boolean> => {
    const session = await auth();
    return !!session?.user;
  },
};
