/**
 * Mobile Client Factory (Expo)
 *
 * Creates a Supabase client for Expo/React Native.
 * Uses Expo SecureStore for session management.
 *
 * This file is imported by the auto-generated mobile.ts wrapper.
 */

import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { TypedSupabaseClient } from "../../client";

/**
 * Expo SecureStore adapter for Supabase auth storage.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Create a Supabase client for Expo/React Native.
 * Singleton pattern - returns the same instance across the app.
 */
let mobileClient: TypedSupabaseClient | null = null;

export function createMobileSupabaseClient(): TypedSupabaseClient {
  if (mobileClient) {
    return mobileClient;
  }

  mobileClient = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  ) as TypedSupabaseClient;

  return mobileClient;
}
