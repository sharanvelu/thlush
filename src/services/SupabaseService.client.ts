import {createBrowserClient} from '@supabase/ssr';
import {Session, Subscription, User} from "@supabase/auth-js";
import type {AuthChangeEvent} from "@supabase/auth-js/src/lib/types";

export const SupabaseService = {
  getBrowserClient: () => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  },

  updateUserPassword: async (password: string) => {
    const supabase = SupabaseService.getBrowserClient();
    return supabase.auth.updateUser({password});
  },

  signInWithPassword: async (email: string, password: string) => {
    const supabase = SupabaseService.getBrowserClient();
    return supabase.auth.signInWithPassword({email, password});
  },

  authUser: async (): Promise<User | null> => {
    const supabase = SupabaseService.getBrowserClient();
    const {data: {user}} = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void | Promise<void>): Subscription => {
    const supabase = SupabaseService.getBrowserClient();
    const {data: {subscription}} = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  signOut: async () => {
    const supabase = SupabaseService.getBrowserClient();
    await supabase.auth.signOut();
  },
}; 