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
import { COOKIE_DOMAIN } from "../../constants";

/**
 * Cookie domain for cross-subdomain auth (builder.trainers.gg, dashboard.trainers.gg).
 * Leading dot makes cookies available to all subdomains of trainers.gg.
 * Undefined in local dev / preview deploys so cookies use browser defaults.
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL?.includes("trainers.gg")
  ? ".trainers.gg"
  : undefined;

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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: COOKIE_DOMAIN,
      },
    }
  ) as TypedSupabaseClient;

  return browserClient;
}
