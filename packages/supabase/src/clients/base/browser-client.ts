/**
 * Browser Client Factory (Next.js Client Components)
 *
 * Creates a Supabase client for Next.js Client Components.
 * Uses localStorage for session management.
 *
 * This file is imported by the auto-generated client.ts wrapper.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { TypedSupabaseClient } from "../../client";

/**
 * Create a Supabase client for Next.js client-side rendering.
 * Singleton pattern - returns the same instance across the app.
 */
let browserClient: TypedSupabaseClient | null = null;

export function createBrowserSupabaseClient(): TypedSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as TypedSupabaseClient;

  return browserClient;
}
