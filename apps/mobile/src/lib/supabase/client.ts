import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@trainers/supabase/types";

/**
 * Web storage adapter using localStorage.
 * Used as fallback when running on web platform where SecureStore is not available.
 */
const WebStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  },
};

/**
 * Native storage adapter using expo-secure-store for secure token persistence.
 * SecureStore has a 2048 byte limit per item, so we handle that gracefully.
 */
const NativeSecureStoreAdapter = {
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

/**
 * Platform-aware storage adapter.
 * - Uses SecureStore on native (iOS/Android) for encrypted storage
 * - Falls back to localStorage on web
 */
const StorageAdapter =
  Platform.OS === "web" ? WebStorageAdapter : NativeSecureStoreAdapter;

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
      storage: StorageAdapter,
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
