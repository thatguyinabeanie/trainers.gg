import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@trainers/supabase/types";

/**
 * Custom storage adapter using expo-secure-store for secure token persistence.
 * SecureStore has a 2048 byte limit per item, so we handle that gracefully.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("SecureStore getItem error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore setItem error:", error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("SecureStore removeItem error:", error);
    }
  },
};

// Lazy singleton - only created when first accessed
let _supabase: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Get the Supabase client instance.
 * Uses lazy initialization to avoid throwing during build/SSR.
 */
export function getSupabase() {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Please add them to your .env.local file."
    );
  }

  _supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable for React Native
    },
  });

  return _supabase;
}

/**
 * @deprecated Use getSupabase() instead for lazy initialization.
 * This export is kept for backwards compatibility but will throw during build if env vars are missing.
 */
export const supabase = new Proxy(
  {} as ReturnType<typeof createSupabaseClient<Database>>,
  {
    get(_target, prop) {
      return Reflect.get(getSupabase(), prop);
    },
  }
);

export function createClient() {
  return getSupabase();
}
