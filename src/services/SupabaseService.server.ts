import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

export const SupabaseService = {
  getServerClient: async () => {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(newCookies) {
            newCookies.forEach((cookie) => {
              cookieStore.set(cookie);
            });
          },
        },
      },
    );
  },

  checkAuth: async () => {
    const supabase = await SupabaseService.getServerClient();
    const {data: {session}} = await supabase.auth.getSession();
    return !!session;
  },

  authUser: async () => {
    const supabase = await SupabaseService.getServerClient();
    const {data: {user}} = await supabase.auth.getUser();
    return user;
  },

  resetPasswordForEmail: async (email: string, redirectTo: string) => {
    const supabase = await SupabaseService.getServerClient();
    return supabase.auth.resetPasswordForEmail(email, {redirectTo});
  },
}; 